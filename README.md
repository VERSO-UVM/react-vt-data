# Vermont Livability Data Visualization App

A **React-based Website** for exploring, visualizing, and interpreting Vermont data. Users can upload one or more datasets and view tables, data summary reports, and custom plots through an interactive interface. The backend is based on https://github.com/iansargent/Data-Exploration-Tool-in-Python.

---

## Installation & Setup

1. **Clone** this repository:

- First, get set up with [large file tracking for git](https://git-lfs.com/)
- Then, run the following in your terminal:

```sh
git lfs install
git clone https://github.com/FWJK1/react-vt-data
cd vermont-livability
```

3. **Install** python dependencies:
   - First, set up [conda](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html) if you don't already have it.
   - Then, use conda to set up your python environment

   ```sh
   cd backend
   conda env create -f environment.yml
   ```

4. **Install** backend react dependencies:
   - First, set up [npm](https://docs.npmjs.com/cli/v6/commands/npm)
   - Then, use npm to install the dependencies:

   ```sh
   cd frontend
   npm install
   ```

## Running the website locally

1. Create the **Local API** Instance in one terminal (from the project root)

   ```sh
   cd backend
   conda activate leahy-data
   uvicorn api.main:app --reload --port 6767
   ```

2. Setup your build to access the local API by adding `NEXT_PUBLIC_API_URL=http://localhost:6767` in `frontend.env.local`

3. **Run** the website from **a different terminal instance** (from the project root):
   ```sh
   cd frontend
   npm run dev
   ```

   - Then open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Development

All development must:

- Use the `prettier` formatter and `eslint` linter for reliable diffs in typescript, and `ruff format` in python.

All development should:

- Use [Mantine](https://mantine.dev/) UI where applicable.
- Use [Axios](https://axios-http.com/docs/intro) for internal API queries (frontend requesting backend API).
- Use [Duckdb](https://duckdb.org/) for any new data queries.

## License

This project is open-source under the **MIT License**.

---

## Credits

- Developed by Ian Sargent and Fitzwilliam Keenan-Koch
- Created under the Open Research Community Accelerator (ORCA)
- Built using the React framework, with Mantine UI.
