import { useUserContext } from '../context/UserContext';

export const useUser = () => {
  return useUserContext();
};

