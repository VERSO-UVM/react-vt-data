// src/components/FilterRedux/filterRequest.ts

import axios from 'axios';

interface Request {
  dataURL: string;
  payload: unknown;
}

export async function postRequest({ dataURL, payload }: Request) {
  try {
    const res = await axios.post(dataURL, payload);
    return res.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error('API Error Details:', {
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        url: dataURL,
        sentPayload: payload,
      });
    } else {
      console.error('Non-Axios Error:', e);
    }
    throw e;
  }
}
