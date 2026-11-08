/**
 * Matches a card's text by its title. Cards may show label chips before the title
 * ("Design" + "Design the empty state"), so the text must *end* with the title.
 */
export function cardTitle(text: string): RegExp {
  return new RegExp(`${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
}
