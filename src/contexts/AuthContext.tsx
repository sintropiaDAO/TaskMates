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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setWalletAddress(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
      // Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      const address = accounts[0].toLowerCase();
      setWalletAddress(address);

      // Create a unique message to sign
      const nonce = Math.floor(Math.random() * 1000000).toString();
      const message = `TaskMates Login\n\nEndereço: ${address}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

      // Request signature from MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // Verify the signature client-side to ensure it's valid
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address) {
        return { error: new Error('Assinatura inválida') };
      }

      // Use wallet address as email format for Supabase auth
      const walletEmail = `${address}@wallet.taskmates.app`;
      // Use signature hash as password (deterministic for same message)
      const walletPassword = ethers.keccak256(ethers.toUtf8Bytes(signature)).slice(2, 34);

      // Try to sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: walletEmail,
        password: walletPassword,
      });

      if (signInError) {
        // If sign in fails, try to create account
        if (signInError.message.includes('Invalid login credentials')) {
          const redirectUrl = `${window.location.origin}/`;
          const { error: signUpError } = await supabase.auth.signUp({
            email: walletEmail,
            password: walletPassword,
            options: {
              emailRedirectTo: redirectUrl,
              data: { 
                wallet_address: address,
                full_name: `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`
              }
            }
          });

          if (signUpError) {
            return { error: signUpError as Error };
          }

          // Auto sign in after signup
          const { error: autoSignInError } = await supabase.auth.signInWithPassword({
            email: walletEmail,
            password: walletPassword,
          });

          if (autoSignInError) {
            return { error: autoSignInError as Error };
          }
        } else {
          return { error: signInError as Error };
        }
      }

      // Update profile with wallet address
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase
          .from('profiles')
          .update({ wallet_address: address })
          .eq('id', currentUser.id);
      }

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
