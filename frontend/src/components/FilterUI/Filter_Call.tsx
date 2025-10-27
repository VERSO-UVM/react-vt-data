import axios from 'axios';

export async function fetchFilteredData(
  selectedFilters: Record<number, string>,
) {
  const filters: Record<string, string> = {};
  Object.values(selectedFilters).forEach((val, idx) => {
    if (val && val !== 'All') filters[`level${idx}`] = val;
  });

  const response = await axios.post('/load/census/data', { filters });
  return response.data;
}
