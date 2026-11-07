export type Tag = { id: number; name: string }
export type Product = { id: number; name: string; tagIds: number[] }
export type Catalog = { tags: Tag[]; products: Product[] }

export function findTags(tags: Tag[], search: string) {
  const query = search.trim().toLocaleLowerCase()
  return tags.filter(tag => tag.name.toLocaleLowerCase().includes(query))
}

export function removeTag(catalog: Catalog, id: number): Catalog {
  return { tags: catalog.tags.filter(tag => tag.id !== id), products: catalog.products.map(product => ({ ...product, tagIds: product.tagIds.filter(tagId => tagId !== id) })) }
}
