import { ipcMain, shell } from "electron";
import { z } from "zod";

// Únicos enlaces externos que la app puede abrir. El renderer manda la clave, nunca la URL.
const ENLACES = {
  "github-dana": "https://github.com/Danitaaaa",
} as const;

const AbrirEnlaceDTOSchema = z.object({
  enlace: z.enum(["github-dana"]),
});

export function registerEnlacesIpc(): void {
  ipcMain.handle("enlaces:abrir", async (_event, datos: unknown) => {
    const { enlace } = AbrirEnlaceDTOSchema.parse(datos);
    await shell.openExternal(ENLACES[enlace]);
  });
}