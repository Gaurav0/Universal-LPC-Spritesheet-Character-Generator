// Credits/Attribution component
import { state } from '../../state/state.js';
import { getAllCredits, creditsToCsv, creditsToTxt } from '../../utils/credits.js';

export const Credits = {
	view: function() {
		// Collect credits from all selected items
		const allCredits = getAllCredits(state.selections, state.bodyType);

		const downloadFile = (content, filename) => {
			const blob = new Blob([content], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		};

		return m("div.box", [
			m("h3.title.is-5", "Credits & Attribution"),
			m("p.subtitle.is-6", "You must credit the authors of this artwork"),

			allCredits.length > 0 ? [
				m("div.content", { style: "max-height: 300px; overflow-y: auto;" },
					allCredits.map(credit =>
						m("div.mb-3", { key: credit.file }, [
							m("strong", credit.file),
							credit.notes ? m("p.is-size-7", credit.notes) : null,
							m("p.is-size-7", [
								m("strong", "Licenses: "),
								credit.licenses.join(", ")
							]),
							m("p.is-size-7", [
								m("strong", "Authors: "),
								credit.authors.join(", ")
							])
						])
					)
				),
				m("div.buttons.mt-3", [
					m("button.button.is-small", {
						onclick: () => downloadFile(creditsToTxt(allCredits), "credits.txt")
					}, "Download TXT"),
					m("button.button.is-small", {
						onclick: () => downloadFile(creditsToCsv(allCredits), "credits.csv")
					}, "Download CSV")
				])
			] : m("p.has-text-grey", "No items selected")
		]);
	}
};
