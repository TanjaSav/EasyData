# EasyData leiðbeiningar um persónuvernd fyrir kennara

EasyData er ætlað fyrir einföld bekkjarverkefni, en kennarar eiga samt að safna eins litlum nemendaupplýsingum og hægt er.

## Viðvaranir um viðkvæm gögn

Ef tafla inniheldur reiti eins og `student_name`, `photo`, `health`, `address`, `behavior`, `disability` eða `national_id`, skilar EasyData viðvörun. Ef slík viðvörun kemur upp þarf að staðfesta með `confirmSensitiveData: true` áður en taflan er búin til eða henni breytt.

Góð regla:

1. Fjarlægðu reitinn ef hann er ekki nauðsynlegur.
2. Notaðu minni persónugreinanleg gögn þegar hægt er, til dæmis nemendaauðkenni í stað fulls nafns.
3. Ákveddu áður en gögnum er safnað hvenær þeim verður eytt.

## Varðveisla gagna

Ný EasyData-forrit fá sjálfgefna varðveislustefnu: skoða og eyða bekkjargögnum í lok skólaárs.

Varðveislustefnu má skoða og breyta með:

```http
GET /apps/:id/retention
PUT /apps/:id/retention
```

Notaðu sérsniðna dagsetningu ef verkefnið þarf að geyma gögn lengur. Ekki geyma nemendagögn lengur en nauðsynlegt er.

## Útflutningur og eyðing

Áður en gögnum er eytt má flytja þau út sem JSON eða CSV:

```http
GET /apps/:id/export
GET /apps/:id/export?format=csv
```

Staka færslu má eyða með:

```http
DELETE /apps/:id/tables/:table/rows/:rowId
```

Heilu forriti má eyða með:

```http
DELETE /apps/:id
```

Eyðing á forriti fjarlægir gagnagrunn forritsins og skrár sem tilheyra því. Eyðing á stakri færslu fjarlægir einnig skrár sem eru vistaðar í `*_file_name` reitum í þeirri færslu.

## Öryggisráðstafanir

EasyData notar auðkenningu, takmörkun á fjölda beiðna, tímabundnar undirritaðar skráarslóðir, skráarprófun og audit log fyrir mikilvægar aðgerðir.

## Einföld regla

Áður en forriti er deilt með nemendum skaltu ákveða:

1. Hvaða gögn þarf raunverulega að safna?
2. Hver má sjá gögnin?
3. Hvenær verður þeim eytt?
