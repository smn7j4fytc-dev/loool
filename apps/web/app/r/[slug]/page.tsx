import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import RegistrationForm from './registration-form';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getBusiness(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/businesses/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const business = await getBusiness(params.slug);
  if (!business) return { title: 'Programa de lealtad' };
  return {
    title: `${business.name} — Programa de lealtad`,
    description: `Regístrate y gana ${business.reward} en ${business.name}`,
  };
}

export default async function LandingPage({ params }: { params: { slug: string } }) {
  const business = await getBusiness(params.slug);
  if (!business) notFound();
  return <RegistrationForm business={business} />;
}
