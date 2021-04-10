import { AuthService } from '../services';

const register = (email: string, password: string) =>
  AuthService.createUser(email, password);
const signin = (email: string, password: string) =>
  AuthService.getToken(email, password);

export { register, signin };
