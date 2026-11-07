export class Socio {
  id: number;
  nombre: string;
  email: string;
  contrasenaHash: string;
  rol: 'socio' | 'bibliotecario';
}
