import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:6767/load',
});

export default api;
