import { ipcMain, shell } from "electron";
import { z } from "zod";

// Únicos enlaces externos que la app puede abrir. El renderer manda la clave, nunca la URL.
const ENLACES = {
  "github-dana": "https://github.com/Danitaaaa",
  // Abre la app de correo con la dirección del equipo y el asunto ya puestos.
  correo: "mailto:babineo.utn15@gmail.com?subject=Syntra%3A%20consulta",
} as const;

const AbrirEnlaceDTOSchema = z.object({
  enlace: z.enum(["github-dana", "correo"]),
});

export function registerEnlacesIpc(): void {
  ipcMain.handle("enlaces:abrir", async (_event, datos: unknown) => {
    const { enlace } = AbrirEnlaceDTOSchema.parse(datos);
    await shell.openExternal(ENLACES[enlace]);
  });
}