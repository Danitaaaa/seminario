import { contextBridge } from 'electron';
import { nodosApi } from './apis/nodo';

contextBridge.exposeInMainWorld('api', {
  ...nodosApi,
});
