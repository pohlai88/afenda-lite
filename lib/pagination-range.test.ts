import { describe, expect, it } from "vitest";
import { getPaginationRange } from "@/lib/pagination-range";

describe("getPaginationRange", () => {
  it("returns all pages when total fits the display window", () => {
    expect(
      getPaginationRange({
        currentPage: 1,
        totalPages: 3,
        paginationItemsToDisplay: 5,
      }),
    ).toEqual({
      pages: [1, 2, 3],
      showLeftEllipsis: false,
      showRightEllipsis: false,
    });
  });

  it("centers the window around the current page", () => {
    expect(
      getPaginationRange({
        currentPage: 5,
        totalPages: 10,
        paginationItemsToDisplay: 3,
      }),
    ).toEqual({
      pages: [4, 5, 6],
      showLeftEllipsis: true,
      showRightEllipsis: true,
    });
  });

  it("pins the window to the start when near page one", () => {
    expect(
      getPaginationRange({
        currentPage: 1,
        totalPages: 10,
        paginationItemsToDisplay: 3,
      }),
    ).toEqual({
      pages: [1, 2, 3],
      showLeftEllipsis: false,
      showRightEllipsis: true,
    });
  });

  it("pins the window to the end when near the last page", () => {
    expect(
      getPaginationRange({
        currentPage: 10,
        totalPages: 10,
        paginationItemsToDisplay: 3,
      }),
    ).toEqual({
      pages: [8, 9, 10],
      showLeftEllipsis: true,
      showRightEllipsis: false,
    });
  });

  it("returns an empty range for zero total pages", () => {
    expect(
      getPaginationRange({
        currentPage: 1,
        totalPages: 0,
        paginationItemsToDisplay: 3,
      }),
    ).toEqual({
      pages: [],
      showLeftEllipsis: false,
      showRightEllipsis: false,
    });
  });
});
