
declare global {
  interface Window {
    api: {
      // agregar aquí cada función que se exponga en preload/index.ts
      crearHorario: (datos: import('./horarios').CrearHorarioInput) => Promise<import('./horarios').HorarioCursado>;
      listarHorarios: (datos: import('./horarios').ListarHorariosInput) => Promise<import('./horarios').HorarioCursado[]>;
      modificarHorario: (datos: import('./horarios').ModificarHorarioInput) => Promise<import('./horarios').HorarioCursado>;
      eliminarHorario: (datos: { id: number }) => Promise<{ ok: boolean }>;
    };
  }
}
