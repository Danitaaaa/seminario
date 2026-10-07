import { contextBridge } from 'electron';
import { horariosApi } from './apis/horarios';

contextBridge.exposeInMainWorld('api', {
  ...horariosApi,
});
