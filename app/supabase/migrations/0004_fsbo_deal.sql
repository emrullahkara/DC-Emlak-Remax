-- FSBO Radar takip kadansı: ilk ve son temas zamanları
-- (istemci tipi: src/domain/fsbo.ts → FsboRow; ortak types.ts'e eklenmesi önerilir)
alter table fsbo_listing add column if not exists ilk_temas date;
alter table fsbo_listing add column if not exists son_temas timestamptz;

-- İşlem hattı sorguları için indeksler
create index if not exists fsbo_listing_office_skor_idx on fsbo_listing (office_id, skor desc);
create index if not exists offer_portfolio_idx on offer (portfolio_id);
create index if not exists deal_portfolio_idx on deal (portfolio_id);
create index if not exists commission_line_deal_idx on commission_line (deal_id);
create index if not exists commission_split_deal_idx on commission_split (deal_id);
