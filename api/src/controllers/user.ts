import { UsersService } from '../services';

const register = (email: string, password: string) =>
  UsersService.createUser(email, password);
const login = (email: string, password: string) =>
  UsersService.getToken(email, password);

export { register, login };
