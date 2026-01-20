import React, { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { OverlayPanel } from "primereact/overlaypanel";
import type { DataTablePageEvent } from "primereact/datatable";

import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./App.css";

/* ===============================
   TYPES
================================ */
interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

const ROWS = 12;

/* ===============================
   APP
================================ */
export default function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);

  /* persistent selection */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* bulk select */
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [bulkCount, setBulkCount] = useState<number | "">("");

  const overlayRef = useRef<OverlayPanel>(null);

  /* ===============================
     FETCH DATA (LAZY)
  ================================ */
  useEffect(() => {
    setLoading(true);

    fetch(
      `https://api.artic.edu/api/v1/artworks?page=${page + 1}&limit=${ROWS}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setArtworks(data.data);
        setTotalRecords(data.pagination.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  /* ===============================
     AUTO SELECT ACROSS PAGES
  ================================ */
  useEffect(() => {
    if (targetCount === null) return;
    if (selectedIds.size >= targetCount) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of artworks) {
        if (next.size >= targetCount) break;
        next.add(row.id);
      }
      return next;
    });
  }, [artworks, targetCount, selectedIds.size]);

  /* ===============================
     BULK SELECT HANDLER
  ================================ */
  const handleBulkSelect = () => {
    if (!bulkCount || bulkCount <= 0) return;
    setTargetCount(Number(bulkCount));
    overlayRef.current?.hide();
    setBulkCount("");
  };

  /* ===============================
     HEADER TEMPLATE
     [ ] ▼
  ================================ */
  const headerCheckboxTemplate = (options: any) => {
    return (
      <div className="header-inline">
        <span className="header-checkbox">{options.checkbox}</span>
        <i
          className="pi pi-chevron-down header-arrow"
          onClick={(e) => overlayRef.current?.toggle(e)}
        />
      </div>
    );
  };

  /* ===============================
     SELECTION HANDLER
  ================================ */
  const selectedRows = artworks.filter((a) => selectedIds.has(a.id));

  const onSelectionChange = (e: any) => {
    const next = new Set(selectedIds);
    const currentPageIds = artworks.map((a) => a.id);
    const selectedPageIds = new Set((e.value as Artwork[]).map((r) => r.id));

    currentPageIds.forEach((id) => {
      if (!selectedPageIds.has(id)) next.delete(id);
    });

    (e.value as Artwork[]).forEach((row) => next.add(row.id));
    setSelectedIds(next);
  };

  /* ===============================
     BOTTOM PAGINATOR
  ================================ */
  const renderPaginator = () => {
    const first = page * ROWS + 1;
    const last = Math.min((page + 1) * ROWS, totalRecords);
    const totalPages = Math.ceil(totalRecords / ROWS);

    return (
      <div className="custom-paginator">
        <div className="paginator-info">
          Showing {first} to {last} of {totalRecords} entries
        </div>

        <div className="paginator-actions">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>

          {[...Array(Math.min(5, totalPages))].map((_, i) => (
            <button
              key={i}
              className={page === i ? "active" : ""}
              onClick={() => setPage(i)}>
              {i + 1}
            </button>
          ))}

          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="root">
      {/* Selected bar */}
      <div className="selected-bar">Selected: {selectedIds.size} rows</div>

      {/* Bulk select popup */}
      <OverlayPanel ref={overlayRef} className="bulk-popup">
        <div className="bulk-container">
          <h4>Select Multiple Rows</h4>
          <span>Enter number of rows to select</span>
          <input
            type="number"
            placeholder="20"
            value={bulkCount}
            onChange={(e) =>
              setBulkCount(e.target.value ? Number(e.target.value) : "")
            }
          />
          <button onClick={handleBulkSelect}>Select</button>
        </div>
      </OverlayPanel>

      {/* DataTable */}
      <DataTable<Artwork>
        value={artworks}
        loading={loading}
        lazy
        rows={ROWS}
        totalRecords={totalRecords}
        first={page * ROWS}
        onPage={(e: DataTablePageEvent) => setPage(e.page ?? 0)}
        dataKey="id"
        selection={selectedRows}
        onSelectionChange={onSelectionChange}
        rowClassName={(row) => (selectedIds.has(row.id) ? "row-selected" : "")}>
        <Column
          selectionMode="multiple"
          header={headerCheckboxTemplate}
          headerStyle={{ width: "220px" }}
        />

        <Column field="title" header="TITLE" />
        <Column field="place_of_origin" header="PLACE OF ORIGIN" />
        <Column field="artist_display" header="ARTIST" />

        {/* ✅ INSCRIPTIONS WITH N/A LOGIC */}
        <Column
          header="INSCRIPTIONS"
          body={(row: Artwork) =>
            row.inscriptions && row.inscriptions.trim() !== "" ?
              row.inscriptions
            : "N/A"
          }
        />

        <Column field="date_start" header="START DATE" />
        <Column field="date_end" header="END DATE" />
      </DataTable>

      {/* Bottom paginator */}
      {renderPaginator()}
    </div>
  );
}
