# Git ve iş akışı Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Dal düzenini, commit mesajlarını, PR akışını, sürümleri ve depo ayarlarını tanımlar.

## 2. Kurallar

- Tek ana dal `main`, korumalı. Kısa ömürlü çalışma dalları: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Commit mesajları Conventional Commits biçiminde ve İngilizcedir. Türler: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `revert`. Kapsamlar modül adlarıdır (`transactions`, `budgets`, `auth`…) ve ayrıca `ui`, `db`, `deps`.
- PR'lar küçük tutulur (üretilen dosyalar hariç 400 satır değişiklik hedefi). PR şablonu: Ne ve neden · Referanslar (UC, FR, BR, ADR) · Nasıl test edildi · Ekran görüntüleri (masaüstü ve telefon) · Bitti tanımı kontrol listesi.
- Her PR birleşmeden önce GitHub'da satır satır kendi kendine incelenir. Birleştirme "squash" ile yapılır; PR başlığı commit mesajı olur.
- Görev takibi GitHub Issues ve Projects ile. Her iş paketi (F1-05 gibi) bir issue'dur; etiketler: faz, tür, öncelik.
- Sürümler SemVer'e uyar ve release-please ile oluşur (`CHANGELOG.md`). Her faz sonu bir minör sürümdür; Faz 1 `v1.0.0`, Faz 7 `v2.0.0`.
- Commit öncesi kontroller (lefthook): biçim, değişen dosyalarda lint, commit mesajı, gitleaks.
- Bağımlılık güncellemeleri: Dependabot haftalık, gruplu; büyük sürüm güncellemeleri elle ve ayrı PR'da.
- Repo ayarları: dal koruması, zorunlu kontroller, doğrusal geçmiş, birleşince dalı silme, gizli bilgi taraması ve push koruması açık.

## 3. Nasıl denetlenir

Commitlint, dal koruma kuralları, PR şablonu.

## 4. Uygulamadaki durum

- Commit kancaları lefthook ile (`lefthook.yml`), commit mesajı denetimi commitlint ile (`commitlint.config.mjs`).

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
