"""Opt-in tests of the repository nginx config and a real mounted MCP server.

Run with MCP_NGINX_TESTS=1 and nginx on PATH, or set NGINX_BINARY explicitly.
Only temporary filesystem paths and listener/upstream ports are adapted.
"""

import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx2
import pytest

from tests.test_mcp_transport import TOKEN_A

pytestmark = pytest.mark.skipif(
    os.environ.get("MCP_NGINX_TESTS") != "1",
    reason="Set MCP_NGINX_TESTS=1 to run real nginx integration tests",
)
BACKEND = Path(__file__).resolve().parents[1]
PUBLIC_HOST = "data.example.test:8443"
AUTH = {"Authorization": f"Bearer {TOKEN_A}"}
UPSTREAM_SCRIPT = """
import sys
import uvicorn
from fastapi import FastAPI
from mcp_server.config import MCPSettings
from mcp_server.server import attach_mcp
from tests.test_mcp_transport import FakeService, TOKEN_A

app = FastAPI()
attach_mcp(app, MCPSettings(
    auth_mode="bearer", bearer_tokens=(TOKEN_A,),
    allowed_hosts=("data.example.test:8443",),
    allowed_origins=("https://data.example.test:8443",),
), FakeService())
uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]),
            proxy_headers=True, forwarded_allow_ips="127.0.0.1",
            access_log=False, log_level="warning")
"""


def unused_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def wait_ready(process, url, log):
    deadline = time.monotonic() + 10
    with httpx2.Client(
        headers={"Host": PUBLIC_HOST, **AUTH}, timeout=0.5, trust_env=False
    ) as http:
        while time.monotonic() < deadline and process.poll() is None:
            try:
                if http.get(f"{url}/api/mcp/health").status_code == 200:
                    return
            except httpx2.HTTPError:
                pass
            time.sleep(0.05)
    pytest.fail(f"Proxy test process did not become ready:\n{log.read_text()}")


def stop_process(process):
    # Each process has its own session; include nginx workers in cleanup.
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=3)


@pytest.fixture(scope="module")
def proxy(tmp_path_factory):
    nginx = shutil.which(os.environ.get("NGINX_BINARY", "nginx"))
    if nginx is None:
        pytest.fail(
            "MCP_NGINX_TESTS=1 requires nginx; set NGINX_BINARY or install nginx"
        )

    directory = tmp_path_factory.mktemp("mcp-nginx")
    (directory / "logs").mkdir()
    (directory / "html").mkdir()
    # Static assets are irrelevant to these proxy tests, but nginx needs its include.
    (directory / "mime.types").write_text("types { text/html html; }\n")
    upstream_port, proxy_port = unused_port(), unused_port()
    configuration = (BACKEND.parent / "frontend" / "nginx.conf").read_text()
    replacements = {
        "/etc/nginx/mime.types": directory / "mime.types",
        "/var/log/nginx/error.log": directory / "nginx-error.log",
        "/tmp/nginx.pid": directory / "nginx.pid",
        "/usr/share/nginx/html": directory / "html",
        **{
            f"/tmp/{name}": directory / name
            for name in (
                "client_temp",
                "proxy_temp",
                "fastcgi_temp",
                "uwsgi_temp",
                "scgi_temp",
            )
        },
    }
    for original, temporary in replacements.items():
        configuration = configuration.replace(original, f'"{temporary}"')
    configuration = configuration.replace(
        "listen 8080;", f"listen 127.0.0.1:{proxy_port};"
    )
    configuration = re.sub(
        r"(proxy_pass http://(?:localhost|127\.0\.0\.1):)6767;",
        lambda match: f"{match[1]}{upstream_port};",
        configuration,
    )
    config_path = directory / "nginx.conf"
    config_path.write_text(configuration)
    processes, logs = [], []
    try:
        for command, url, name in (
            (
                [sys.executable, "-c", UPSTREAM_SCRIPT, str(upstream_port)],
                f"http://127.0.0.1:{upstream_port}",
                "uvicorn",
            ),
            (
                [
                    nginx,
                    "-p",
                    f"{directory}/",
                    "-c",
                    str(config_path),
                    "-g",
                    "daemon off;",
                ],
                f"http://127.0.0.1:{proxy_port}",
                "nginx",
            ),
        ):
            log_path = directory / f"{name}-process.log"
            log = log_path.open("w")
            logs.append(log)
            process = subprocess.Popen(
                command,
                cwd=BACKEND,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
            processes.append(process)
            wait_ready(process, url, log_path)
        with httpx2.Client(
            base_url=f"http://127.0.0.1:{proxy_port}",
            headers={
                "Host": PUBLIC_HOST,
                "Accept": "application/json, text/event-stream",
            },
            timeout=2,
            follow_redirects=False,
            trust_env=False,
        ) as http:
            yield http
    finally:
        for process in reversed(processes):
            stop_process(process)
        for log in logs:
            log.close()


@pytest.mark.parametrize(
    "method,path", [("POST", "/api/mcp"), ("GET", "/api/mcp/health")]
)
@pytest.mark.parametrize(
    "forwarded,scheme",
    [
        (("https",), "https"),
        ((), "http"),
        (("http",), "http"),
        (("ftp",), "http"),
        (("https, http",), "http"),
        (("https", "http"), "http"),
    ],
)
def test_redirect_preserves_public_scheme_host_and_query(
    proxy, method, path, forwarded, scheme
):
    headers = list(AUTH.items()) + [("X-Forwarded-Proto", value) for value in forwarded]
    response = proxy.request(method, f"{path}/?probe=alpha%2Fbeta&n=1", headers=headers)
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{scheme}://{PUBLIC_HOST}{path}?probe=alpha%2Fbeta&n=1"
    )


def test_exact_paths_preserve_authentication_health_and_tool_calls(proxy):
    assert proxy.get("/api/mcp/health").status_code == 401
    assert (
        proxy.get(
            "/api/mcp/health", headers={"Authorization": "Bearer invalid"}
        ).status_code
        == 401
    )
    headers = {
        **AUTH,
        "X-Forwarded-Proto": "https",
        "Origin": f"https://{PUBLIC_HOST}",
    }
    assert proxy.get("/api/mcp/health", headers=headers).json() == {"status": "ready"}
    assert proxy.get("/api/mcp", headers=headers).status_code == 405
    for method, params in (
        ("tools/list", {}),
        ("tools/call", {"name": "query_data", "arguments": {"dataset_id": "example"}}),
    ):
        response = proxy.post(
            "/api/mcp",
            headers=headers,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        )
        assert response.status_code == 200
        result = response.json()["result"]
        if method == "tools/list":
            assert "query_data" in {tool["name"] for tool in result["tools"]}
        else:
            assert not result.get("isError", False)
            assert result["structuredContent"]["rows"] == [{"value": 643077}]
