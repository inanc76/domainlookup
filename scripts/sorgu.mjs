// TASLAK (kırmızı taban için) — her ada BOS der; gerçek uygulama sonraki commit'te
export async function sorgulaHepsi(adlar) { return adlar.map((alan) => ({ alan, durum: 'BOS' })); }
