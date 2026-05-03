import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { ethers } from 'ethers';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  walletAddress: string | null;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithWallet: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data as Profile);
      if (data.wallet_address) {
        setWalletAddress(data.wallet_address);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(async () => {
            if (!mounted) return;
            await fetchProfile(session.user.id);
            if (mounted) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setWalletAddress(null);
          setLoading(false);
        }
      }
    );

    // Trigger INITIAL_SESSION event
    supabase.auth.getSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithWallet = async (): Promise<{ error: Error | null }> => {
    if (typeof window.ethereum === 'undefined') {
      return { error: new Error('MetaMask não está instalado') };
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[];

      const address = accounts[0].toLowerCase();
      setWalletAddress(address);

      // 1. Ask the server for a single-use nonce/message
      const { data: nonceData, error: nonceError } = await supabase.functions.invoke('wallet-auth', {
        body: { action: 'nonce', address },
      });
      if (nonceError || !nonceData?.message) {
        return { error: new Error(nonceError?.message || 'Falha ao obter nonce') };
      }

      // 2. User signs the server-issued message in MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonceData.message);

      // 3. Server verifies the signature and returns a verifiable token
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('wallet-auth', {
        body: { action: 'verify', address, signature },
      });
      if (verifyError || !verifyData?.token_hash || !verifyData?.email) {
        return { error: new Error(verifyError?.message || 'Falha na verificação da assinatura') };
      }

      // 4. Exchange the magic-link token for an active session
      const { error: otpError } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: verifyData.token_hash,
      });
      if (otpError) return { error: otpError as Error };

      return { error: null };
    } catch (error) {
      console.error('Erro ao fazer login com carteira:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setWalletAddress(null);
    setProfile(null);
  };

  const connectWallet = async (): Promise<string | null> => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask não está instalado');
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      const address = accounts[0];
      setWalletAddress(address);

      if (user) {
        await supabase
          .from('profiles')
          .update({ wallet_address: address })
          .eq('id', user.id);
        
        await refreshProfile();
      }

      return address;
    } catch (error) {
      console.error('Erro ao conectar carteira:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    if (user) {
      supabase
        .from('profiles')
        .update({ wallet_address: null })
        .eq('id', user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      walletAddress,
      signUp,
      signIn,
      signInWithWallet,
      signOut,
      connectWallet,
      disconnectWallet,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
