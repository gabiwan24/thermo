# Papier

Nach jedem Foto- oder Textdruck folgen 13 mm Papier-Vorschub: 6 mm für den Abstand zum Abrissmechanismus plus 7 mm verbleibender Abreißrand. Die App rechnet die Strecke mit der Auflösung des gewählten Modells um: 104 Druckpunkte bei 203 dpi, 154 bei 300 dpi. Auch der M02-Druckpfad übernimmt diesen Wert. Der Vortrieb wird nach den unveränderten Bilddaten gesendet.

UI/UX-Prüfung mit nachvollziehbaren Journeys und Grenzen: [UX_AUDIT.md](UX_AUDIT.md).

Textentwurf, gewähltes Modell und Bearbeitungseinstellungen werden lokal im Browser gespeichert. Fotos bleiben nur in der Sitzung. `preferences.js` wird zusammen mit den übrigen App-Modulen für Hosting benötigt. Der Druckbutton führt bei fehlender Verbindung direkt zum Systemmenü; gedruckt wird erst nach einem weiteren expliziten Druckbefehl.

## Live-Kamera

„Selfie“ wechselt zur Frontkamera, „Rückkamera“ zurück. Der vorherige Stream wird vor dem Wechsel gestoppt. Bilddrehung, Helligkeit, Kontrast und Raster bleiben erhalten. Eine nicht verfügbare Kamera wird gemeldet und die vorherige Kamera erneut geöffnet. Vorschau und Druck bleiben ungespiegelt, damit der Ausdruck der Vorschau entspricht.

Das leicht transparente weiße Kamera-Overlay startet eingeklappt. „Regler“ öffnet und schließt Helligkeit, Kontrast und Rasterauswahl mit einer kurzen Animation. Auslösen und Drehen bleiben erreichbar. Das Bild liegt hinter dem Overlay; Scrollen bleibt möglich, Scrollbalken sind unsichtbar. Bei reduzierten Bewegungen wird die Animation deaktiviert.

Fotos und Live-Kamera nutzen immer die volle Druckbreite ohne Fotorand. Im Querformat wird die lange Seite auf die Druckbreite skaliert, im Hochformat die kurze. Die Höhe ergibt sich proportional; lange Bilder werden nicht zur Einhaltung einer Vorschauhöhe verkleinert. Nur die Protokollgrenze von 65535 Rasterzeilen wird als Fehler abgefangen. Die Randoption gilt ausschließlich für Textetiketten.

Die Kameravorschau skaliert Druckpunkte in ganzzahlige Gerätepixel. Die Punktgröße richtet sich nach der verfügbaren Breite und bleibt bei 90°-Drehungen gleich. Höhere oder breitere Vorschauen sind scrollbar; sie werden nicht mehr automatisch an die Höhe angepasst.

Im Kameramodus zeigt ein Canvas laufend das fertige Druckraster. Helligkeit, Kontrast und Rasterauswahl liegen im Overlay; das Drehsymbol rotiert in 90°-Schritten. Kamera und fertige Aufnahme verwenden dieselbe Bildaufbereitung und volle Druckbreite. Es wird kein Ausschnitt abgeschnitten. Für die Vorschau werden höchstens 15 Bilder pro Sekunde verarbeitet; das tatsächliche Tempo hängt vom Handy ab.

Die Kamera fordert die höchste vom Browser angebotene Stream-Auflösung an und speichert den aufgenommenen Frame intern in dieser Auflösung. Das angezeigte Endresultat wird entsprechend der realen Druckerauflösung gerastert (T02: 384 px breit). Die maximal mögliche Sensor-Fotoauflösung kann von der angebotenen Videoauflösung abweichen. Kein Upscaling als vermeintliche zusätzliche Bilddetails.

Das Manifest setzt Hochformat für die installierte Web-App. Eine Browser-Orientierungssperre wird versucht; auf mobilen Geräten im Querformat verhindert ein Hochformat-Hinweis die Bedienung. Das Bild selbst kann unabhängig davon gedreht werden. Kamera und Animationsschleife werden beim Schließen und Hintergrundwechsel gestoppt. Für Hosting zusätzlich `photo.js` und `manifest.webmanifest` bereitstellen. Reale Android-Kamera und Drucker sind noch zu prüfen.

## Oberfläche

Die aktuelle Gestaltung verwendet eine klare Titelhierarchie, einen zusammenhängenden Bildbereich, gruppierte Kamera-/Galerie-Werkzeuge und eine weiche, abgesetzte Aktionsleiste. Der Druckerstatus ist im Kopf sichtbar und öffnet die Systemeinstellungen. Gruppierte Tonflächen ersetzen die früheren vielen Einzelrahmen; monochrome Farben und das Pixel-Logo bleiben erhalten. Orientierung: [Apple HIG – Layout](https://developer.apple.com/design/human-interface-guidelines/layout), insbesondere visuelle Hierarchie, Ausrichtung und gruppierte Steuerungselemente.

Das reduzierte Layout priorisiert die randlose Vorschau. Eine kompakte Leiste unten kombiniert Foto/Text mit der Hauptaktion. PNG-Export und 1:1-Ansicht liegen im Systemmenü. „Bearbeiten“ ersetzt im Textmodus das Druckbild an derselben Stelle durch das Eingabefeld; „Fertig“ wechselt zurück. Es gibt keine doppelte große Textfläche. Pixelschrift bleibt als Akzent für Logo und Moduswahl erhalten; sonst werden gut lesbare Systemschriften verwendet. Der Dither-Hintergrund ist auf einen schmalen Streifen begrenzt.

Die Vorschau steht an erster Stelle. Foto-/Textnavigation bleibt am unteren Bildschirmrand fixiert, die Bearbeitungseinstellungen sind standardmäßig eingeklappt. Druckermodell und Bluetooth-Verbindung liegen im Burger-Menü. Der Text selbst bleibt direkt editierbar; Schrift und Ausrichtung liegen unter Einstellungen.

Mobile Oberfläche in Schwarz-Weiß mit diagonalem Bayer-Verlauf. Die Schriftdatei `assets/papier-pixel.ttf` wird aus denselben selbst gezeichneten Glyphen wie die Druckschrift erzeugt. Foto/Text, Kamera, Galerie, Vorschau, Druck und PNG-Export bleiben erhalten. Rastervergleich und Druckerauswahl sind eingeklappt; die Oberfläche enthält kurze Labels statt Funktionsbeschreibungen. Für Hosting zusätzlich den Ordner `assets/` bereitstellen.

Die erzeugten Assets liegen fertig vor; die App benötigt keine Build-Abhängigkeiten. Erneuern: `node --input-type=module -e "import {interfaceGlyphs} from './pixel-font.js'; import {writeFileSync} from 'node:fs'; writeFileSync('tools/glyphs.json', JSON.stringify(interfaceGlyphs));"` und `tools/build-design.py` mit FontTools ausführen.

Eine kleine Foto-Web-App für Android + Chrome und Phomemo: Galerie, Live-Kamera, Rotation, Helligkeit, sechs Dithermuster im direkten Vergleich, Vorschau, PNG-Export und Bluetooth-Druck. Bilder werden lokal verarbeitet und nicht hochgeladen. Keine Installation von npm-Paketen nötig; Node.js 22 reicht.

## Textetiketten

„Textetikett“ öffnet einen mehrzeiligen Texteditor mit echter Bitmap-Pixelschrift als Vorgabe, optional Sans/Mono-Systemschrift und Fett, Größen von 9 bis 54 Druckpixeln und Links-/Mittel-/Rechtsausrichtung. Der Text wird direkt auf der gewählten Druckerbreite gezeichnet und danach ohne Dithering in 1-Bit-Schwarz-Weiß umgerechnet. Er wird nicht als Foto skaliert. Lange Wörter und Zeilen werden umgebrochen; mehr als 1600 Pixel Höhe werden mit einer Fehlermeldung abgelehnt. Foto und Text bleiben beim Moduswechsel erhalten. PNG und Druck verwenden dasselbe Raster. Systemschriften können je nach Handy unterschiedlich aussehen. Die eigene Bitmap-Schrift zeichnet 5×7-Grundzeichen mit zwei zusätzlichen Umlautzeilen. Sie skaliert ausschließlich ganzzahlig (1× bis 6×); jedes Zeichen besteht aus schwarzen Pixelblöcken ohne Font-Rasterizer. Fehlende Zeichen werden gemeldet. „Originalpixel anzeigen“ verhindert eine Einpassung der Vorschau und erlaubt horizontales Scrollen.

## Dithermuster vergleichen

Foto auswählen oder „Testmotiv laden“ anklicken. Die Vergleichsansicht zeigt Floyd–Steinberg, Atkinson, Bayer 2×2, 4×4, 8×8 und Schwarz-Weiß per Schwellenwert. Ein Klick auf eine Kachel wählt das Muster für die große Vorschau, den Druck und den PNG-Export. Helligkeit, Kontrast und Rotation gelten für alle Kacheln gleichermaßen. „Raster-Detail“ zeigt in jeder Kachel denselben mittigen Bildausschnitt mit größeren Punkten, ohne den Ausdruck zuzuschneiden. Die Vorschauen werden aus denselben 1-Bit-Daten wie der Druck aufgebaut; bei verkleinerter Browserdarstellung können Raster geglättet erscheinen. Für die Beurteilung einzelner Punkte das PNG in Originalgröße ansehen.

## Lokal starten

```sh
npm start
```

Am Computer http://localhost:8080 öffnen. Tests: `npm test`.

## Auf dem Android-Handy

Die App benötigt **HTTPS** für Kamera und Web Bluetooth. `http://192.168.…:8080` ist dafür nicht ausreichend. Den Inhalt dieses Ordners auf einem HTTPS-Static-Host bereitstellen (benötigt werden index.html, style.css, app.js, image.js, text.js, pixel-font.js und vendor/). Alternativ funktioniert ein HTTPS-Tunnel zu Port 8080. Die App im normalen Chrome-Tab öffnen, nicht in einem eingebetteten Browser. Das lokale Entwicklungs-Setup veröffentlicht die App noch nicht.

1. Drucker einschalten, Papier einlegen und die Verbindung in der Phomemo-App schließen.
2. Bild auswählen oder Kamerazugriff erlauben und Foto aufnehmen.
3. Bildstil, Helligkeit und Rand in der Vorschau prüfen.
4. Passendes Modell auswählen (Vorgabe T02). Auf „Drucker verbinden“ tippen und das eigene Gerät im Android-Dialog auswählen.
5. „Foto drucken“ sendet eine Kopie. Erst am Gerät prüfen, bevor erneut gedruckt wird. Die App bestätigt die Übertragung, nicht den mechanischen Druckabschluss.

T02 ist im übernommenen Code mit 384 Pixeln / 48 Bytes konfiguriert; dessen README nennt abweichend 432 Pixel. Hier folgt die App dem ausführbaren Code. Die tatsächliche Druckbreite und Kommunikation müssen am eigenen Gerät geprüft werden. Andere auswählbare Modelle verwenden die Konfigurationen des Basisprojekts.

## Umfang der ersten Version

Ein Foto pro Druck, volle Druckbreite und proportionale Höhe ohne Fotorand. Die Protokollgrenze liegt bei 65535 Rasterzeilen; längere Bilder werden abgelehnt. JPG/PNG/WebP abhängig vom Browser; HEIC wird bei fehlender Browserunterstützung mit einer Fehlermeldung abgefangen. Kamera wird beim Schließen oder Wechseln in den Hintergrund gestoppt. Kein Cloud-Dienst, keine Konten, kein automatischer Druck, kein Vorlageneditor.

## Herkunft

Basis: https://github.com/DeepCoreSystem/myphomemo, Commit `3b28fbd106cd733bcfaf1cfa7b2e361971ca586c`.

`vendor/ble.js`, `vendor/constants.js`, `vendor/printer.js` stammen aus `src/web/`. In `ble.js` wurde die Verfügbarkeitsprüfung korrigiert: Entscheidend ist eine nutzbare `requestDevice`-Methode. Die übrigen Treiberdateien sind unverändert. Das Basis-Repository liegt lokal in `upstream/` und ist vom Upload ausgeschlossen. Seine README erklärt MIT-Lizenzierung, enthält an diesem Stand aber keine LICENSE-Datei; Lizenztext und Copyright-Hinweise sollten mit dem Projekt geklärt werden.

Die eigene Oberfläche und Bildverarbeitung liegen in index.html, style.css, app.js und image.js. Der lokale Server gibt nur benötigte App-Dateien frei, keine Repository-Metadaten oder Tests.

Noch kein Hardwaretest: Kamera, Bluetooth und Papierausgabe müssen auf deinem Android-Handy und Drucker geprüft werden.
