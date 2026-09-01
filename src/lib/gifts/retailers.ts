export const approvedGiftProductHosts = [
  'adafruit.com',
  'aeropress.com',
  'barnesandnoble.com',
  'bellroy.com',
  'fieldnotesbrand.com',
  'fellowproducts.com',
  'grovemade.com',
  'ifixit.com',
  'jetpens.com',
  'keychron.com',
  'leevalley.com',
  'logitech.com',
  'muji.us',
  'nostarch.com',
  'orbitkey.com',
  'peakdesign.com',
  'phaidon.com',
  'rei.com',
  'simplehuman.com',
  'sparkfun.com',
  'store.moma.org',
  'taschen.com',
  'theyamazakihome.com',
  'ugmonk.com',
  'uncommongoods.com',
  'www.adafruit.com',
  'www.aeropress.com',
  'www.barnesandnoble.com',
  'www.bellroy.com',
  'www.bhphotovideo.com',
  'www.fieldnotesbrand.com',
  'www.fellowproducts.com',
  'www.grovemade.com',
  'www.ifixit.com',
  'www.jetpens.com',
  'www.keychron.com',
  'www.leevalley.com',
  'www.logitech.com',
  'www.muji.us',
  'www.nostarch.com',
  'www.orbitkey.com',
  'www.peakdesign.com',
  'www.phaidon.com',
  'www.rei.com',
  'www.simplehuman.com',
  'www.sparkfun.com',
  'www.taschen.com',
  'www.theyamazakihome.com',
  'www.ugmonk.com',
  'www.uncommongoods.com',
] as const

const underThirtyGiftProductHosts: ReadonlySet<string> = new Set([
  'adafruit.com',
  'barnesandnoble.com',
  'fieldnotesbrand.com',
  'ifixit.com',
  'jetpens.com',
  'muji.us',
  'nostarch.com',
  'sparkfun.com',
  'store.moma.org',
  'uncommongoods.com',
  'www.adafruit.com',
  'www.barnesandnoble.com',
  'www.fieldnotesbrand.com',
  'www.ifixit.com',
  'www.jetpens.com',
  'www.muji.us',
  'www.nostarch.com',
  'www.sparkfun.com',
  'www.uncommongoods.com',
])

const approvedGiftProductHostSet: ReadonlySet<string> = new Set(approvedGiftProductHosts)

export function isApprovedGiftProductHost(hostname: string): boolean {
  return approvedGiftProductHostSet.has(hostname.toLowerCase())
}

export function giftSearchProductHosts(budget: string): readonly string[] {
  return budget === 'under_30'
    ? approvedGiftProductHosts.filter((host) => underThirtyGiftProductHosts.has(host))
    : approvedGiftProductHosts
}
