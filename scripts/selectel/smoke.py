#!/usr/bin/env python3
"""Fail-closed HTTP/TLS checks of the exact staging release being activated."""

import argparse
from pathlib import Path
import re
import subprocess
import tempfile
import time
from urllib.parse import urlsplit


HOST = "origin.zolotoy.dev"
STATIC_CACHE = "public, max-age=0, must-revalidate"
PUBLIC_PATHS = (
    "/", "/architecture/", "/services/order/", "/services/auth/",
    "/services/notification/", "/services/url-shortener/",
)


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


class Client:
    def __init__(self, host: str, resolve: str | None, scratch: Path):
        self.host = host
        self.resolve = resolve
        self.scratch = scratch
        self.deadline = time.monotonic() + 120

    def request(self, path: str, status: int, *, method: str = "GET", http: bool = False):
        scheme, port = ("http", 80) if http else ("https", 443)
        headers_path, body_path = self.scratch / "headers", self.scratch / "body"
        command = [
            "curl", "--disable", "--silent", "--show-error", "--noproxy", "*",
            "--proto", "=" + scheme, "--connect-timeout", "5", "--max-time", "20",
            "--dump-header", str(headers_path), "--output", str(body_path),
            "--write-out", "%{http_code}",
        ]
        if not http:
            command += ["--tlsv1.2"]
        if method == "HEAD":
            command += ["--head"]
        elif method != "GET":
            command += ["--request", method]
        if self.resolve:
            command += ["--resolve", f"{self.host}:{port}:{self.resolve}"]
        command += [f"{scheme}://{self.host}{path}"]
        remaining = self.deadline - time.monotonic()
        expect(remaining > 0, "HTTP smoke exceeded its 120-second deadline")
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=min(25, remaining))
        expect(result.stdout == str(status), f"{method} {path}: expected {status}, received {result.stdout}")
        header_block = headers_path.read_text().strip().split("\n\n")[-1]
        headers = {}
        for line in header_block.splitlines()[1:]:
            key, separator, value = line.partition(":")
            if separator:
                headers[key.lower()] = value.strip()
        if not http:
            expect(headers.get("x-robots-tag") == "noindex,nofollow", f"{path}: staging noindex is missing")
        return headers, body_path.read_bytes()


def check_identity(client: Client, release_id: str) -> None:
    headers, body = client.request("/_release", 200)
    expect(headers.get("cache-control") == "no-store", "Release identity must not be cached")
    expect(body == (release_id + "\n").encode(), "HTTP origin is serving a different release")


def check(client: Client, release_id: str, identity_only: bool, unavailable: bool) -> None:
    headers, _ = client.request("/_health", 200)
    expect(headers.get("cache-control") == "no-store", "Health must not be cached")
    if unavailable:
        client.request("/", 503)
        client.request("/_release", 503)
        return
    check_identity(client, release_id)
    if identity_only:
        return

    home = b""
    for path in PUBLIC_PATHS + tuple("/ru" + path for path in PUBLIC_PATHS):
        headers, body = client.request(path, 200)
        expect("text/html" in headers.get("content-type", ""), f"{path}: not HTML")
        expect(headers.get("cache-control") == STATIC_CACHE, f"{path}: cache policy differs from Worker")
        expected_locale = b'<html lang="ru"' if path.startswith("/ru/") else b'<html lang="en"'
        expect(expected_locale in body, f"{path}: wrong locale or non-prerendered document")
        if path == "/":
            home = body

    for path in ("/demo/", "/demo/orders/", "/demo/orders/new", "/demo/orders/smoke-id",
                 "/demo/auth/login", "/demo/notifications/events/smoke-id", "/demo/shortener/smoke-id"):
        headers, body = client.request(path, 200)
        expect("text/html" in headers.get("content-type", ""), f"{path}: demo shell is not HTML")
        expect(headers.get("cache-control") == STATIC_CACHE, f"{path}: unexpected cache policy")
        expect(b'id="app"' in body, f"{path}: demo shell is missing")

    for path, target, status in (
        ("/demo?smoke=1", "/demo/?smoke=1", 308),
        ("/demo/index.html?smoke=1", "/demo/?smoke=1", 308),
        ("/orders/smoke-id?smoke=1", "/demo/orders/smoke-id?smoke=1", 308),
        ("/auth/login?smoke=1", "/demo/auth/login?smoke=1", 308),
        ("/architecture?smoke=1", "/architecture/?smoke=1", 307),
        ("/ru/services/order/index.html?smoke=1", "/ru/services/order/?smoke=1", 307),
    ):
        headers, _ = client.request(path, status)
        destination = urlsplit(headers.get("location", ""))
        expect(destination.netloc in ("", client.host), f"{path}: redirect leaves staging")
        expect(destination.scheme in ("", "https"), f"{path}: insecure redirect")
        expect(destination.path + ("?" + destination.query if destination.query else "") == target,
               f"{path}: incorrect redirect target")

    for path in ("/__selectel_missing__", "/ru/__selectel_missing__", "/demo/__selectel_missing__",
                 "/demo/orders/id/extra", "/assets/__selectel_missing__.js", "/demo/missing.js"):
        client.request(path, 404)

    headers, worker = client.request("/demo/mockServiceWorker.js", 200)
    expect("javascript" in headers.get("content-type", ""), "MSW worker has the wrong content type")
    expect(headers.get("cache-control") == STATIC_CACHE, "MSW worker cache policy differs from Worker")
    expect(b"Mock Service Worker" in worker, "MSW worker content is missing")

    asset = re.search(rb'(?:src|href)="(/assets/[^"?#]+\.(?:js|css))"', home)
    expect(asset is not None, "Built HTML contains no JS/CSS asset")
    headers, body = client.request(asset.group(1).decode(), 200)
    expect(headers.get("cache-control") == STATIC_CACHE, "Static asset cache policy differs from Worker")
    expect(bool(body) and not body.lstrip().lower().startswith(b"<!doctype"), "Static asset returned HTML")
    expected_mime = "javascript" if asset.group(1).endswith(b".js") else "text/css"
    expect(expected_mime in headers.get("content-type", ""), "Static asset MIME type is incorrect")
    client.request("/robots.txt", 200)
    client.request("/sitemap.xml", 200)
    client.request("/demo/", 200, method="HEAD")
    client.request("/demo/orders/", 405, method="POST")

    headers, _ = client.request("/demo/?smoke=1", 308, http=True)
    expect(headers.get("location") == f"https://{client.host}/demo/?smoke=1", "HTTP does not redirect to staging HTTPS")
    # A second identity check catches an unrelated switch during the smoke run.
    check_identity(client, release_id)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", required=True, choices=[HOST])
    parser.add_argument("--release", required=True)
    parser.add_argument("--resolve", choices=["127.0.0.1"])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--identity-only", action="store_true")
    mode.add_argument("--unavailable", action="store_true")
    args = parser.parse_args()
    expect(re.fullmatch(r"[0-9a-f]{40}-[1-9][0-9]{0,19}-[1-9][0-9]{0,5}", args.release) is not None,
           "Invalid release identity")
    # Remote writes stay under releases, including temporary curl output.
    with tempfile.TemporaryDirectory(prefix=".smoke-", dir=Path(__file__).resolve().parent) as scratch:
        check(Client(args.host, args.resolve, Path(scratch)), args.release, args.identity_only, args.unavailable)
    print(f"Staging smoke passed ({'loopback TLS' if args.resolve else 'public DNS/TLS'}): {args.release}")


if __name__ == "__main__":
    main()
