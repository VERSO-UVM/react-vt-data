from concurrent.futures import ThreadPoolExecutor

WORKERS = 8


def pmap(fn, items, workers: int = WORKERS) -> list:
    """Run fn over items in threads within ONE data source; results keep input order."""
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(fn, items))
