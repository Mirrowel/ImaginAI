import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";

/** Return the current session user if logged in. */
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: api.getMe });
}

/** Log in or register with alpha nickname/password credentials. */
export function useAuthAction(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, nickname, password }: { mode: "login" | "register"; nickname: string; password: string }) =>
      mode === "login" ? api.login(nickname, password) : api.register(nickname, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      onSuccess?.();
    },
  });
}

/** Log out the current browser session. */
export function useLogout(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      onSuccess?.();
    },
  });
}
