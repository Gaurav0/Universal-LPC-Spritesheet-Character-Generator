// CollapsibleSection component tests
import mq from "mithril-query";
import o from "ospec";
import { CollapsibleSection } from "../sources/components/CollapsibleSection.js";

o.spec("CollapsibleSection", function() {
  o("renders with a title", function() {
    const out = mq(m(CollapsibleSection, { title: "Test Section" }));

    // More specific assertion
    out.should.have("h3.title");
    o(out.first("h3").textContent).equals("Test Section");

    // Check for exact element
    out.should.have(".collapsible-title");
  });

  o("renders children when not collapsed (defaultOpen: true)", function() {
    const out = mq(
      m(
        CollapsibleSection,
        {
          title: "Section",
          defaultOpen: true
        },
        "Child content"
      )
    );

    // Should show child content when open
    const child = out.first("div.collapsible-content");
    o(child.textContent).equals("Child content");
  });

  o("hides children when collapsed (defaultOpen: false)", function() {
    const out = mq(
      m(
        CollapsibleSection,
        {
          title: "Section",
          defaultOpen: false
        },
        "Child content"
      )
    );

    // Should not show child content when collapsed
    out.should.not.have("div.collapsible-content");
    out.should.not.contain("Child content");
  });

  o("starts open by default", function() {
    const out = mq(
      m(
        CollapsibleSection,
        {
          title: "Section"
        },
        "Content"
      )
    );

    // Should be open by default (defaultOpen: true)
    const child = out.first("div.collapsible-content");
    o(child.textContent).equals("Content");
  });

  o("shows expanded arrow when open", function() {
    const out = mq(
      m(CollapsibleSection, {
        title: "Section",
        defaultOpen: true
      })
    );

    // Should have expanded arrow class
    out.should.have("span.tree-arrow.expanded");
  });

  o("shows collapsed arrow when closed", function() {
    const out = mq(
      m(CollapsibleSection, {
        title: "Section",
        defaultOpen: false
      })
    );

    // Should have collapsed arrow class
    out.should.have("span.tree-arrow.collapsed");
  });

  o("applies custom box class", function() {
    const out = mq(
      m(CollapsibleSection, {
        title: "Section",
        boxClass: "custom-box"
      })
    );

    // Should have the custom class
    out.should.have("div.custom-box");
  });

  o("uses default box class when not specified", function() {
    const out = mq(
      m(CollapsibleSection, {
        title: "Section"
      })
    );

    // Should have default "box" class
    out.should.have(".box");
  });
});
