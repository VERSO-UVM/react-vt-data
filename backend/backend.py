from fastapi import FastAPI



app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/load")
def read_root(filename):
    return app_utils.process_file(filename)
