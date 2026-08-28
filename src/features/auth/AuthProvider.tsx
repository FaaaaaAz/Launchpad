import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { supabaseProfileRepository } from '@/database';
import type { ProfilePatch } from '@/database';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Profile } from '@/types';

import * as authService from './authService';
import type { GoogleSignInResult, SignUpInput, SignUpResult } from './authService';
import { EMAIL_CONFIRM_PATH, PASSWORD_RESET_PATH, matchesPath, readAuthCallback } from './deepLinks';

/**
 * Sesion de Launchpad.
 *
 * Es la unica pieza de la app que sabe si hay alguien dentro. Ninguna pantalla
 * pregunta a Supabase por su cuenta: todas usan `useAuth()`. Si cada una
 * consultara por separado, la app tendria tantas verdades sobre la sesion como
 * pantallas montadas, y se contradirian en cuanto una caducara.
 */

/** Fases del arranque. `loading` es la que evita el parpadeo del login. */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;

  /** Configuración ausente o mal puesta en `.env`. Bloquea la app entera. */
  configError: string | null;

  /**
   * Llego un enlace de recuperacion y ya hay sesion para cambiar la
   * contraseña. Es lo que hace que la app abra la pantalla de contraseña nueva
   * en lugar del dashboard.
   */
  recoveryPending: boolean;

  /** Error de un enlace entrante (caducado, cancelado). Se muestra y se limpia. */
  linkError: string | null;

  /** Proveedores con los que esta cuenta puede entrar: 'email', 'google'. */
  providers: string[];
  /** Si tiene contraseña propia. Falso en una cuenta creada solo con Google. */
  hasPassword: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<Profile>;
  refreshProfile: () => Promise<void>;
  /** Cierra el flujo de contraseña nueva y devuelve la app a su curso normal. */
  completeRecovery: () => void;
  dismissLinkError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Sesion                                                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    // Sin configuracion no hay cliente con el que hablar. Se sale del estado
    // de carga para que la pantalla de error pueda dibujarse.
    if (supabaseConfigError) {
      setInitializing(false);
      return;
    }

    let active = true;

    /**
     * Primera lectura: la sesion guardada en el dispositivo.
     *
     * Hasta que esto responda no se sabe si toca el acceso o el dashboard, y
     * por eso `status` empieza en 'loading'. Enseñar el login "mientras tanto"
     * es lo que produce ese parpadeo de un segundo que delata a las apps mal
     * montadas.
     */
    void (async () => {
      const stored = await authService.getStoredSession();
      if (!active) return;
      setSession(stored);
      setInitializing(false);
    })();

    /**
     * A partir de aqui, Supabase avisa de todo cambio:
     *
     *   INITIAL_SESSION   la sesion cargada del almacen al arrancar
     *   SIGNED_IN         entro (por correo, por Google o canjeando un enlace)
     *   SIGNED_OUT        salio, o el refresh token dejo de valer
     *   TOKEN_REFRESHED   se renovo el access token: hay que quedarse el nuevo
     *   USER_UPDATED      cambio el correo o la contraseña
     *   PASSWORD_RECOVERY se abrio una sesion desde el enlace de recuperacion
     *
     * El callback es sincrono a proposito. La documentacion de Supabase avisa
     * de que llamar a otro metodo de `auth` desde dentro puede bloquearse
     * esperando el mismo cerrojo que ya tiene tomado; lo unico que se hace es
     * guardar estado, y el trabajo asincrono (leer el perfil) ocurre en otro
     * efecto que reacciona a ese estado.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;

      setSession(next);
      setInitializing(false);

      if (event === 'PASSWORD_RECOVERY') setRecoveryPending(true);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setRecoveryPending(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Perfil                                                             */
  /* ------------------------------------------------------------------ */

  const userId = session?.user.id ?? null;
  const user = session?.user ?? null;

  const loadProfile = useCallback(async (id: string, fallback: User | null) => {
    const found = await supabaseProfileRepository.find(id);
    if (found) return found;

    /**
     * Sin perfil, pero con cuenta.
     *
     * Pasa en dos casos reales: una cuenta creada antes de que existiera el
     * trigger `handle_new_user`, o la carrera --breve pero posible-- entre el
     * alta y esta lectura. En vez de dejar la app sin nombre, se crea a partir
     * de lo que Auth ya sabe del usuario.
     */
    const meta = (fallback?.user_metadata ?? {}) as Record<string, unknown>;
    const pick = (key: string): string | null => {
      const value = meta[key];
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    };

    return supabaseProfileRepository.upsert(id, {
      displayName: pick('display_name') ?? pick('full_name') ?? pick('name'),
      firstName: pick('first_name') ?? pick('given_name'),
      lastName: pick('last_name') ?? pick('family_name'),
      avatarUrl: pick('avatar_url') ?? pick('picture'),
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const loaded = await loadProfile(userId, user);
        if (active) setProfile(loaded);
      } catch (error) {
        // Un perfil que no carga no debe dejar al usuario fuera: la app
        // funciona sin nombre, y el saludo cae al generico de PAD.
        console.error('[Launchpad] No se pudo cargar el perfil:', error);
      }
    })();

    return () => {
      active = false;
    };
    // `user` se omite a proposito: cambia de identidad en cada refresco de
    // token y volveria a leer el perfil sin motivo. El id es lo que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loadProfile]);

  /* ------------------------------------------------------------------ */
  /* Enlaces entrantes                                                  */
  /* ------------------------------------------------------------------ */

  // Un mismo enlace puede llegar dos veces: por `getInitialURL` (la app estaba
  // cerrada) y por el escuchador (ya estaba abierta). El codigo es de un solo
  // uso, asi que canjearlo dos veces fallaria; se recuerda cual se atendio.
  const handledLinks = useRef(new Set<string>());

  useEffect(() => {
    if (supabaseConfigError) return;

    let active = true;

    const handle = async (url: string) => {
      if (!active || handledLinks.current.has(url)) return;

      const isRecovery = matchesPath(url, PASSWORD_RESET_PATH);
      const isConfirm = matchesPath(url, EMAIL_CONFIRM_PATH);
      if (!isRecovery && !isConfirm) return;

      handledLinks.current.add(url);

      const callback = readAuthCallback(url);

      if (callback.kind === 'error') {
        setLinkError(callback.message);
        return;
      }

      if (callback.kind !== 'code') return;

      try {
        await authService.exchangeCode(callback.code);
        // Canjear ya deja sesion abierta: `onAuthStateChange` se encarga del
        // resto. Lo unico que falta es decidir a donde va el usuario.
        if (active && isRecovery) setRecoveryPending(true);
      } catch (error) {
        if (active) {
          setLinkError(
            error instanceof Error
              ? error.message
              : 'Ese enlace ya no es válido. Pide uno nuevo.',
          );
        }
      }
    };

    // La app abierta desde cero por el enlace.
    void Linking.getInitialURL().then((url) => {
      if (url) void handle(url);
    });

    // La app ya abierta en segundo plano.
    const subscription = Linking.addEventListener('url', ({ url }) => void handle(url));

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Acciones                                                           */
  /* ------------------------------------------------------------------ */

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const loaded = await supabaseProfileRepository.find(userId);
    if (loaded) setProfile(loaded);
  }, [userId]);

  const value = useMemo<AuthContextValue>(() => {
    const status: AuthStatus = initializing
      ? 'loading'
      : session
        ? 'signed-in'
        : 'signed-out';

    return {
      status,
      session,
      user,
      profile,
      configError: supabaseConfigError,
      recoveryPending,
      linkError,
      providers: authService.providersOf(user),
      hasPassword: authService.hasPasswordIdentity(user),

      // Ninguna de estas guarda la sesion a mano: `onAuthStateChange` la
      // recibe de todas formas y es la unica via por la que entra al estado.
      // Escribirla aqui tambien crearia dos caminos que hay que mantener
      // sincronizados.
      signIn: async (email, password) => {
        await authService.signIn(email, password);
      },

      signUp: (input) => authService.signUp(input),

      signInWithGoogle: () => authService.signInWithGoogle(),

      signOut: async () => {
        await authService.signOut();
      },

      resetPassword: (email) => authService.resetPassword(email),

      updatePassword: async (password) => {
        await authService.updatePassword(password);
      },

      updateProfile: async (patch) => {
        if (!userId) {
          throw new Error('No hay ninguna sesión activa.');
        }
        const updated = await supabaseProfileRepository.upsert(userId, patch);
        setProfile(updated);
        return updated;
      },

      refreshProfile,

      completeRecovery: () => setRecoveryPending(false),
      dismissLinkError: () => setLinkError(null),
    };
  }, [initializing, session, user, profile, recoveryPending, linkError, userId, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}
