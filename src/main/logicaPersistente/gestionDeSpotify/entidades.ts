// Cuenta de Spotify vinculada a un usuario de la app.
export interface CuentaSpotify {
  idUsuario: number;
  // Refresh token tal como está en la base (cifrado si cifrado = true).
  refreshToken: string;
  cifrado: boolean;
  alcances: string;
  fechaVinculacion: Date;
}
