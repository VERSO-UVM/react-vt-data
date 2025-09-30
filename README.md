# Vermont Livability Data Visualization App

A **React-based Website** for exploring, visualizing, and interpreting Vermont data. Users can upload one or more datasets and view tables, data summary reports, and custom plots through an interactive interface. The backend is based on https://github.com/iansargent/Data-Exploration-Tool-in-Python.

---

## Installation & Setup

1. **Clone** this repository:

   ```sh
   git clone https://github.com/FWJK1/react-vt-data
   cd vermont-livability
   ```

2. **Install** python dependencies:

   ```sh
   cd backend
   pip install -r requirements.txt
   ```

3. **Install** backend react dependencies:

   - First, set up [npm](https://docs.npmjs.com/cli/v6/commands/npm)
   - Then, use npm to install the dependencies:

   ```sh
   cd frontend
   npm install
   ```

4. **Run** the website from the terminal:
   ```sh
   cd frontend
   npm run dev
   ```
   - Then open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Development

All development must:

- Use the `prettier` formatter and `eslint` linter for reliable diffs.

All development should:

- Use Mantine UI where applicable.

## License

This project is open-source under the **MIT License**.

---

## Credits

- Developed by Ian Sargent and Fitzwilliam Keenan-Koch
- Created under the Open Research Community Accelerator (ORCA)
- Built using the React framework
