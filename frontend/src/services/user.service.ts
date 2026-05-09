import api from './api';
import { User } from '../types';

class UserService {
  async getAllUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/users/');
    return response.data;
  }
  
  async approveUser(userId: number): Promise<void> {
    await api.put(`/users/${userId}/approve`);
  }
  
  async blockUser(userId: number): Promise<void> {
    await api.put(`/users/${userId}/block`);
  }
  
  async unblockUser(userId: number): Promise<void> {
    await api.put(`/users/${userId}/unblock`);
  }
  
  async deleteUser(userId: number): Promise<void> {
    await api.delete(`/users/${userId}`);
  }
  
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.put('/users/me/password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }
}

export const userService = new UserService();