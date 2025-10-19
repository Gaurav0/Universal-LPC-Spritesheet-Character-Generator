// SearchControl component tests
import mq from "mithril-query";
import o from "ospec";
import { state } from "../sources/state/state.js";
import { SearchControl } from "../sources/components/filters/SearchControl.js";

o.spec("SearchControl", function() {
  o.beforeEach(function() {
    // Reset state before each test
    state.searchQuery = "";
  });

  o("renders a search input field", function() {
    const out = mq(SearchControl);

    // Should render an input with type=search and placeholder attribute
    out.should.have("input[type=search][placeholder=Search]");
  });

  o("displays the label 'Search:'", function() {
    const out = mq(SearchControl);

    // Should have a label with text "Search:"
    out.should.contain("Search:");
  });

  o("input reflects current state value", function() {
    const test_query = "test query";
    state.searchQuery = test_query;
    const out = mq(SearchControl);

    // Input value should match state
    o(out.first("input").value).equals(test_query);
  });
});
