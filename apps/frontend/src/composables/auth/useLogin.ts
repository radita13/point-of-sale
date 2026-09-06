import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores';

export function useLogin() {
  const router = useRouter();
  const auth = useAuthStore();

  const email = ref('');
  const password = ref('');
  const error = ref('');
  const isLoading = ref(false);

  async function handleLogin() {
    error.value = '';
    isLoading.value = true;
    try {
      await auth.login(email.value, password.value);
      toast.success('Selamat datang!');
      await router.push({ name: 'kasir' });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal masuk. Cek email/password.';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    email,
    password,
    error,
    isLoading,
    handleLogin,
  };
}
