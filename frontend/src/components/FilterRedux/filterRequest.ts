import { FilterSpec } from './filterTypes';
import axios from 'axios';

interface request {
  dataURL: string;
  payload: FilterSpec[];
}
export async function postRequest(request: request) {
  const { dataURL, payload } = request;
  try {
    const res = await axios.post(dataURL, payload);
    return res.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error('postRequest failed: ', e.response?.data);
    } else {
      console.error('postRequest failed: ', e);
    }
    throw e; // re-throw so caller can stop / show state
  }
}
