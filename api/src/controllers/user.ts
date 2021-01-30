import { PublicService } from '../services';

const register = (email: string, password: string) =>
  PublicService.createUser(email, password);
const login = (email: string, password: string) =>
  PublicService.getToken(email, password);

export { register, login };
