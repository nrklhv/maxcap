import { InvestorCatalogPropertyDetail } from "@/components/portal/investor-catalog-property-detail";

type Props = { params: { id: string } };

/**
 * Investor-facing property detail for catalog rows (linked from Mis reservas grid).
 *
 * @route /reserva/propiedad/:id
 * @domain portal
 */
export default function InvestorCatalogPropertyPage({ params }: Props) {
  return <InvestorCatalogPropertyDetail propertyId={params.id} />;
}
