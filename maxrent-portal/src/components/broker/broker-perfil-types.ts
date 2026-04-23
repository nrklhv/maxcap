/**
 * Shared props for broker `/broker/perfil` layout (session snapshot + Prisma Profile select).
 *
 * @domain maxrent-portal / broker
 */

export type BrokerPerfilAccountProps = {
  email: string;
  name: string | null;
  image: string | null;
};

export type BrokerPerfilPersonalProfile = {
  firstName: string | null;
  lastName: string | null;
  contactEmail: string | null;
  rut: string | null;
  phone: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
} | null;
