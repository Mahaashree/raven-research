import ItemDetailClient from "./ItemDetailClient";

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  return <ItemDetailClient id={id} />;
}
