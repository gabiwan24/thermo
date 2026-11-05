# UI/UX-Prüfung · 25. Oktober 2026

Ergänzung vom 5. November 2026: Selfie-/Rückkamerawechsel im Browser mit synthetischen Streams geprüft. Fehlt die Frontkamera, wird die Rückkamera wieder geöffnet und eine Meldung angezeigt. Die Druckpfade der vier auswählbaren Modelle sind für 7 mm Vortrieb getestet; 18 automatisierte Tests bestehen. Reale Android-Kameras und Papierausgabe sind weiterhin ungeprüft.

Geprüft wurden echte Bedienabläufe im Browser, schmale Viewports mit 320 und 390 CSS-Pixeln, synthetische Kamera und simulierte Bluetooth-Fehler. Maßstab: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), insbesondere Reflow (1.4.10), sichtbarer Fokus (2.4.11), Zielgrößen (2.5.8), Fehleridentifikation (3.3.1) und Statusmeldungen (4.1.3). Für Touch-Bedienung wurden überwiegend mindestens 44 px große Ziele verwendet. Keine formale Konformitätszertifizierung.

## Durchgespielte Journeys

| Ablauf | Gefundener Mangel | Änderung / Ergebnis |
|---|---|---|
| Erststart → Foto oder Text | Leeres Pluszeichen ohne erkennbare Aktion | Kurzer Leerzustand mit „Bild wählen“ bzw. „Text schreiben“ |
| Text → Drucken ohne Drucker | Deaktivierter Button, Verbindung nur versteckt im Menü | „Drucker verbinden“ führt direkt zum Verbindungsdialog; kein automatischer Druck nach Verbindung |
| Verbindungsfehler | Meldung erschien hinter dem modalen Menü | Fehler direkt im Menü, Verbindung erneut möglich; mit synthetischem Fehler geprüft |
| Browser ohne Web Bluetooth | Deaktivierter Button ohne erkennbaren Grund | „Bluetooth fehlt“, Browserhinweis im Systemmenü, PNG-Export bleibt verfügbar |
| Text → Reload | Entwurf und Einstellungen gingen verloren | Validierter lokaler Textentwurf und Einstellungen werden wiederhergestellt; im Browser geprüft |
| Foto → Text → Foto | Vorschauzoom sprang beim Wechsel | Ansichtswahl bleibt erhalten; Foto und Text bleiben getrennt erhalten |
| Ungültiges Pixelzeichen | Alter Ausdruck oder unklare Aktion möglich | Ungültiger Text markiert, genaue Fehlermeldung, kein Druck/Export des alten Rasters, „Text prüfen“ |
| Foto → Regler ändern | Sechs Konvertierungen trotz geschlossenem Vergleich | Nur ausgewähltes Raster wird berechnet; vollständiger Vergleich erst beim Öffnen |
| Datei wechseln | Ungültige zweite Auswahl konnte Ladezustand festhalten | Ladezustand wird auch bei Validierungsfehlern beendet; bestehende Vorschau wird nicht als neue Datei ausgegeben |
| Kamera → drehen → Kontrast → aufnehmen | Bedienung und Übernahme mussten überprüft werden | Mit synthetischem 1920×1080-Stream durchgespielt; Aufnahme übernimmt 90° und Kontrast, Ausgabe 384×683 |
| Galerie → Vorschau | Import musste überprüft werden | Lokale PNG-Testgrafik über echten Dateiauswahldialog importiert, Ausgabe 384×403 |
| Text → PNG speichern | Download musste überprüft werden | Echte Datei heruntergeladen, PNG-Signatur und 384×92-Pixel-Abmessungen geprüft |
| Kleine Displays → Einstellungen | Fokus/Navigation und überflüssig deaktivierte Optionen | Scrollabstände zur Bottom-Navigation, Tastatur-Viewport-Anpassung, größere Reglerziele; „Fett“ bei Bitmap-Schrift ausgeblendet |
| Logo antippen | Unbeabsichtigter Reload konnte Eingaben löschen | Logo ist eine Überschrift statt Reload-Link |

## Testumfang und offene Grenzen

- 17 automatisierte Tests bestehen: Raster, Druckdaten, Kontrast, Drehung, volle Druckbreite, Bitmap-Schrift, Umbruch, Entwurfsvalidierung und Bluetooth-Verfügbarkeit.
- Die Kamera und Bluetooth-Fehler wurden im Browser mit kontrollierten Testdaten geprüft. Kein echter Druckauftrag und kein Test mit einem physischen T02.
- Die Bildschirmtastatur eines echten Android-Geräts, TalkBack/VoiceOver und Langzeitbetrieb der Kamera müssen noch am Gerät geprüft werden.
- Die vom Nutzer gewünschte Hochformat-Beschränkung bleibt erhalten. Das ist eine bewusste Einschränkung gegenüber WCAG 1.3.4 (Orientierung); die App ist deshalb nicht als vollständig WCAG-AA-konform zu bezeichnen.
- Fotos bleiben nur in der aktuellen Sitzung; Text und Editor-Einstellungen werden lokal auf dem Gerät gespeichert. Keine Fotos oder Texte werden hochgeladen.
- Scrollbalken bleiben wie gewünscht unsichtbar; Vorschauen lassen sich per Touch und in der Hauptansicht auch per fokussierbarer Tastaturregion verschieben.

Die Testansicht ist lokal unter `node tools/camera-test-server.js` und `http://localhost:8081/qa?width=320` bzw. `390` erreichbar. `&ble=error` simuliert einen Verbindungsfehler, `&ble=off` fehlendes Web Bluetooth. Sie greift nicht auf echte Kameras oder Drucker zu.
