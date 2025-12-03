import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { login, getDashboard } from '../config/api';

const useAuth = create((set) => ({
  user: null,
  isLoading: true,
  login: async (email, password) => {
    try {
      const res = await login({ email, password });
      const user = res.data.metadata.user;
      await SecureStore.setItemAsync('admin_logged', '1');
      set({ user, isLoading: false });
      return user;
    } catch (err) {
      throw err;
    }
  },
  checkAuth: async () => {
    try {
      await getDashboard();
      set({ isLoading: false });
    } catch (err) {
      set({ user: null, isLoading: false });
    }
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('admin_logged');
    set({ user: null });
  },
}));

export default useAuth;