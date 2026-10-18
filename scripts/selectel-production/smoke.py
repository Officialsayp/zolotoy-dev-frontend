#!/usr/bin/env python3
"""Check the fixed production host, optionally pinned to the Selectel IPv4."""
import argparse
from pathlib import Path
import re
import subprocess
import tempfile

HOST = "zolotoy.dev"
CACHE = "public, max-age=0, must-revalidate"
PUBLIC = ("/", "/architecture/", "/services/order/", "/services/auth/",
          "/services/notification/", "/services/url-shortener/")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release", required=True)
    transport = parser.add_mutually_exclusive_group()
    transport.add_argument("--resolve", choices=["135.106.186.27", "127.0.0.1"])
    transport.add_argument("--ssh-tunnel", action="store_true",
                           help="Use existing SSH forwards on localhost 18443/18080; still verify production TLS")
    args = parser.parse_args()
    assert re.fullmatch(r"prod-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}", args.release), "Invalid release ID"
    count = 0
    with tempfile.TemporaryDirectory(prefix="zolotoy-production-smoke-") as temporary:
        scratch = Path(temporary)

        def request(path, status=200, *, robots=None, cache=None, http=False, method="GET"):
            nonlocal count
            scheme, port = ("http", 80) if http else ("https", 443)
            command = ["curl", "--disable", "--noproxy", "*", "--silent", "--show-error",
                       "--proto", "=" + scheme, "--connect-timeout", "5", "--max-time", "15",
                       "--dump-header", str(scratch / "headers"), "--output", str(scratch / "body"),
                       "--write-out", "%{http_code}"]
            if args.resolve:
                command += ["--resolve", f"{HOST}:{port}:{args.resolve}"]
            if args.ssh_tunnel:
                command += ["--connect-to", f"{HOST}:{port}:127.0.0.1:{18443 if port == 443 else 18080}"]
            if method == "HEAD":
                command += ["--head"]
            elif method != "GET":
                command += ["--request", method]
            command += [f"{scheme}://{HOST}{path}"]
            result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=20)
            assert result.stdout == str(status), f"{method} {path}: HTTP {result.stdout}, expected {status}"
            headers = {}
            for line in (scratch / "headers").read_text().strip().split("\n\n")[-1].splitlines()[1:]:
                key, separator, value = line.partition(":")
                if separator:
                    headers[key.lower()] = value.strip()
            assert headers.get("x-robots-tag") == robots, f"{path}: incorrect robots header"
            if cache:
                assert headers.get("cache-control") == cache, f"{path}: incorrect cache policy"
            assert headers.get("server", "").lower() == "caddy", f"{path}: response is not from Caddy"
            count += 1
            return headers, (scratch / "body").read_bytes()

        def identity():
            _, body = request("/_release", robots="noindex", cache="no-store")
            assert body == (args.release + "\n").encode(), "Wrong production release"

        identity()
        _, body = request("/_health", robots="noindex", cache="no-store")
        assert body == b"ok"
        home = b""
        for path in PUBLIC + tuple("/ru" + p for p in PUBLIC):
            headers, body = request(path, cache=CACHE)
            assert "text/html" in headers.get("content-type", "")
            assert (b'<html lang="ru"' if path.startswith("/ru/") else b'<html lang="en"') in body
            assert b'name="robots" content="index,follow"' in body, f"{path}: public document is not indexable"
            canonicals = re.findall(rb'<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"[^>]*>', body)
            assert canonicals == [f"https://{HOST}{path}".encode()], f"{path}: incorrect production canonical"
            if path == "/":
                home = body
        for path in ("/demo/", "/demo/orders/", "/demo/orders/new", "/demo/auth/login",
                     "/demo/notifications/events/smoke-id", "/demo/shortener/smoke-id"):
            _, body = request(path, robots="noindex,follow", cache=CACHE)
            assert b'id="app"' in body
        for path, target, status in (("/demo?check=1", "/demo/?check=1", 308),
                                     ("/orders/id?check=1", "/demo/orders/id?check=1", 308),
                                     ("/architecture?check=1", "/architecture/?check=1", 307)):
            headers, _ = request(path, status)
            assert headers.get("location") in (target, "https://" + HOST + target)
        for path in ("/__production_missing__", "/ru/__production_missing__", "/assets/__production_missing__.js"):
            request(path, 404)
        request("/demo/__production_missing__", 404, robots="noindex")
        headers, body = request("/demo/mockServiceWorker.js", cache=CACHE)
        assert "javascript" in headers.get("content-type", "") and b"Mock Service Worker" in body
        asset = re.search(rb'(?:src|href)="(/assets/[^"?#]+\.(?:js|css))"', home)
        assert asset, "No built asset in HTML"
        _, body = request(asset.group(1).decode(), cache=CACHE)
        assert body and not body.lower().startswith(b"<!doctype")
        request("/robots.txt", cache=CACHE)
        headers, _ = request("/sitemap.xml", cache=CACHE)
        assert headers.get("content-type", "").startswith("application/xml")
        request("/demo/", method="HEAD", robots="noindex,follow", cache=CACHE)
        request("/demo/orders/", 405, method="POST")
        headers, _ = request("/ru/?check=1", 308, http=True)
        assert headers.get("location") == "https://zolotoy.dev/ru/?check=1"
        identity()
    route = "SSH tunnel" if args.ssh_tunnel else args.resolve or "public DNS"
    print(f"Production smoke passed: {count} HTTP/TLS checks, {args.release}, transport={route}")


if __name__ == "__main__":
    main()
