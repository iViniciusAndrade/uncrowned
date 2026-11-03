#!/usr/bin/env python3
"""Gera data/off_br.js com os produtos vendidos no Brasil do Open Food Facts (licença ODbL).

Uso: zcat en.openfoodfacts.org.products.csv.gz | python3 tools/off_br.py SAIDA.js
Lê o CSV (separado por tab) da entrada padrão e grava:
  window.OFFBR=[[codigo, nome, marca, kcal, prot, carb, gord, fibra|null, sodio_mg|null, porcao_g|null], ...]
Valores por 100 g/ml. Descarta produto sem nome, sem calorias ou com números impossíveis.
"""
import csv, json, sys

csv.field_size_limit(1 << 30)


def num(v):
    if v is None or v == '':
        return None
    try:
        x = float(v)
    except ValueError:
        return None
    return x if x == x and x >= 0 else None  # tira NaN e negativo


def r1(x):
    return None if x is None else round(x, 1)


def main(out_path):
    rd = csv.reader(sys.stdin, delimiter='\t', quoting=csv.QUOTE_NONE)
    head = next(rd)
    ix = {h: i for i, h in enumerate(head)}
    need = ['code', 'product_name', 'brands', 'countries_tags', 'proteins_100g', 'carbohydrates_100g', 'fat_100g']
    miss = [c for c in need if c not in ix]
    if miss:
        sys.exit('colunas faltando no CSV: ' + ', '.join(miss))

    def col(row, name):
        i = ix.get(name)
        return row[i] if i is not None and i < len(row) else ''

    seen, seen2, out = set(), set(), []
    total = br = 0
    for row in rd:
        total += 1
        if 'en:brazil' not in col(row, 'countries_tags'):
            continue
        br += 1
        code = col(row, 'code').strip()
        name = ' '.join((col(row, 'product_name_pt') or col(row, 'product_name')).split())
        if not code or not name or len(name) > 100 or code in seen:
            continue
        kcal = num(col(row, 'energy-kcal_100g'))
        if kcal is None:
            kj = num(col(row, 'energy_100g'))
            kcal = kj / 4.184 if kj is not None else None
        p, c, g = num(col(row, 'proteins_100g')), num(col(row, 'carbohydrates_100g')), num(col(row, 'fat_100g'))
        if kcal is None or p is None or c is None or g is None:
            continue
        if kcal > 900 or p + c + g > 102:
            continue
        est = 4 * p + 4 * c + 9 * g
        if est > 30 and (kcal < est * 0.5 or kcal > est * 1.6 + 40):
            continue  # calorias não batem com os macros: dado digitado errado
        brand = ' '.join(col(row, 'brands').split(',')[0].split())[:40]
        k2 = (name.lower(), brand.lower(), round(kcal))
        if k2 in seen2:
            continue
        seen.add(code); seen2.add(k2)
        f = num(col(row, 'fiber_100g'))
        na = num(col(row, 'sodium_100g'))
        sq = num(col(row, 'serving_quantity'))
        out.append([code, name, brand, round(kcal), r1(p), r1(c), r1(g), r1(f),
                    None if na is None or na > 40 else round(na * 1000),
                    r1(sq) if sq and 0 < sq <= 2000 else None])

    out.sort(key=lambda x: (x[2].lower(), x[1].lower()))
    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write('/* Produtos vendidos no Brasil. Fonte: Open Food Facts (openfoodfacts.org), licença ODbL. Gerado por tools/off_br.py. */\n')
        fh.write('window.OFFBR=')
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
        fh.write(';\n')
    print(f'linhas lidas: {total}  do Brasil: {br}  gravados: {len(out)}', file=sys.stderr)


if __name__ == '__main__':
    main(sys.argv[1])
