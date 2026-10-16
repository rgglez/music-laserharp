.PHONY: tags patch publish pot po json i18n

CURRENT_VERSION := $(shell node -p "require('./package.json').version")
PARTS          := $(subst ., ,$(CURRENT_VERSION))
MAJOR          := $(word 1,$(PARTS))
MINOR          := $(word 2,$(PARTS))
PATCH          := $(word 3,$(PARTS))
NEXT_PATCH     := $(shell expr $(PATCH) + 1)
NEXT_VERSION   := $(MAJOR).$(MINOR).$(NEXT_PATCH)

tags:
	@git tag --sort=-v:refname

patch:
	@echo "$(CURRENT_VERSION) → $(NEXT_VERSION)"
	@node -e "\
		const fs = require('fs'); \
		const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); \
		pkg.version = '$(NEXT_VERSION)'; \
		fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');"
	@git add package.json
	@git commit -m "chore: bump version to $(NEXT_VERSION)"
	@git tag v$(NEXT_VERSION)
	@git push origin HEAD
	@git push origin v$(NEXT_VERSION)
	@echo "Tagged v$(NEXT_VERSION) and pushed."

publish:
	@echo "Publishing v$(CURRENT_VERSION) to npm..."
	@npm publish --access public
	@echo "Published $(CURRENT_VERSION)."

# --- Translations ------------------------------------------------------------
# msgids are English; each catalog is src/locales/<lang>.po -> <lang>.json.
LANGS    := es fr de zh
LOCALES  := src/locales
PO2JSON  ?= ../gettext-po2json/src/po2json.pl
SOURCES  := $(filter-out %.test.ts,$(wildcard src/*.ts))

pot:
	@xgettext -o $(LOCALES)/messages.pot -L TypeScript --from-code=utf-8 \
		--no-wrap --keyword=_ --keyword=_n:1,2 --keyword=N_ \
		--package-name=music-laserharp $(SOURCES)

po: pot
	@for l in $(LANGS); do \
		msgmerge -q -U --backup=none --no-wrap $(LOCALES)/$$l.po $(LOCALES)/messages.pot; \
		msgfmt --check -o /dev/null $(LOCALES)/$$l.po; \
	done

# po2json.pl builds its temp-file template from --po, so pass bare filenames.
json:
	@cd $(LOCALES) && for l in $(LANGS); do \
		perl $(abspath $(PO2JSON)) --po $$l.po --json $$l.json --context app; \
	done

i18n: po json
