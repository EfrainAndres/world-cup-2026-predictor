"use client";

import React, { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { GroupedTeamOption } from "../lib/grouped-team-options";
import { filterGroupedTeamOptions, groupFilteredTeamMatches } from "../lib/grouped-team-options";

interface SearchableTeamSelectProps {
  label: string;
  value: string;
  options: readonly GroupedTeamOption[];
  excludedTeam?: string;
  onChange: (nextValue: string) => void;
}

export function SearchableTeamSelect({ label, value, options, excludedTeam, onChange }: SearchableTeamSelectProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredMatches = useMemo(() => filterGroupedTeamOptions(options, query, excludedTeam), [excludedTeam, options, query]);
  const groupedMatches = useMemo(() => groupFilteredTeamMatches(filteredMatches), [filteredMatches]);
  const selectedOption = options.find((option) => option.canonicalName === value);
  const displayValue = isOpen ? query : value;

  // onBlur defers closeList() so a mousedown on an option (which preventDefault()s
  // to keep focus on the input) has a chance to register before the list unmounts.
  // The pending timer must be cancelled whenever the input is reopened — otherwise
  // a blur from an earlier interaction (e.g. clicking a submit button while this
  // input still had focus) can fire after the input has since been refocused and
  // given a new query, force-closing a list the user is actively selecting from.
  const blurCloseTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Because onMouseDown on an option preventDefault()s (see above), the input
  // never actually blurs during a pointer-based selection — it stays focused
  // through mousedown/mouseup/click. On mobile that means the keyboard stays
  // open, and some browsers deliver a stray refocus/click to the still-focused
  // input once the tapped option is removed from the DOM (the option collapses
  // out from under the finger), which re-triggers onFocus/onClick -> openList()
  // immediately after handleSelect() just closed the list. justSelectedRef is a
  // short-lived guard consulted by openList() so that stray reopen attempt is
  // ignored; it auto-clears quickly so an intentional, later reopen still works.
  const justSelectedRef = useRef(false);
  const justSelectedTimeoutRef = useRef<number | null>(null);

  function cancelPendingBlurClose(): void {
    if (blurCloseTimeoutRef.current !== null) {
      window.clearTimeout(blurCloseTimeoutRef.current);
      blurCloseTimeoutRef.current = null;
    }
  }

  function markJustSelected(): void {
    justSelectedRef.current = true;

    if (justSelectedTimeoutRef.current !== null) {
      window.clearTimeout(justSelectedTimeoutRef.current);
    }

    justSelectedTimeoutRef.current = window.setTimeout(() => {
      justSelectedRef.current = false;
      justSelectedTimeoutRef.current = null;
    }, 150);
  }

  useEffect(() => {
    return () => {
      cancelPendingBlurClose();
      if (justSelectedTimeoutRef.current !== null) {
        window.clearTimeout(justSelectedTimeoutRef.current);
      }
    };
  }, []);

  function openList(): void {
    if (justSelectedRef.current) return;
    cancelPendingBlurClose();
    setIsOpen(true);
    setHighlightedIndex(0);
  }

  function closeList(resetQuery = true): void {
    cancelPendingBlurClose();
    setIsOpen(false);
    setHighlightedIndex(0);

    if (resetQuery) {
      setQuery("");
    }
  }

  // Shared by both pointer and keyboard selection. Blurring is intentionally
  // NOT done here: keyboard (Enter) selection keeps focus on the input so Tab
  // continues to the next field per the ARIA combobox convention, while
  // pointer/touch selection blurs explicitly from the option's onClick — the
  // two interaction types warrant different focus outcomes, which is not the
  // same thing as branching on device/browser.
  function handleSelect(canonicalName: string): void {
    onChange(canonicalName);
    closeList();
    markJustSelected();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        openList();
        return;
      }

      setHighlightedIndex((current) => (filteredMatches.length === 0 ? 0 : Math.min(current + 1, filteredMatches.length - 1)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        openList();
        return;
      }

      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const selectedMatch = filteredMatches[highlightedIndex];

      if (selectedMatch !== undefined) {
        handleSelect(selectedMatch.option.canonicalName);
      }

      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeList();
    }
  }

  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="relative mt-2">
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={isOpen && filteredMatches[highlightedIndex] !== undefined ? `${inputId}-option-${highlightedIndex}` : undefined}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
          value={displayValue}
          placeholder="Search or select a team"
          autoComplete="off"
          onFocus={() => openList()}
          onClick={() => openList()}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);

            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            cancelPendingBlurClose();
            blurCloseTimeoutRef.current = window.setTimeout(() => {
              blurCloseTimeoutRef.current = null;
              closeList();
            }, 100);
          }}
        />

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
          >
            {filteredMatches.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-500">No teams match your search.</p>
            ) : (
              groupedMatches.map((group) => (
                <div key={group.group}>
                  <p className="sticky top-0 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {`Group ${group.group}`}
                  </p>
                  <ul>
                    {group.matches.map((match) => {
                      const optionIndex = filteredMatches.findIndex((entry) => entry.option.canonicalName === match.option.canonicalName);
                      const isHighlighted = optionIndex === highlightedIndex;
                      const isSelected = match.option.canonicalName === selectedOption?.canonicalName;

                      return (
                        <li key={match.option.canonicalName}>
                          <button
                            id={`${inputId}-option-${optionIndex}`}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                              isHighlighted ? "bg-teal-50 text-teal-950" : "bg-white text-slate-800"
                            } ${isSelected ? "font-semibold" : "font-medium"}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setHighlightedIndex(optionIndex)}
                            onClick={() => {
                              handleSelect(match.option.canonicalName);
                              // Pointer/touch selection: proactively give up
                              // focus so the mobile keyboard dismisses and the
                              // confirmed value is visible immediately, rather
                              // than leaving the input focused (and reopen-prone)
                              // until the user taps elsewhere.
                              inputRef.current?.blur();
                            }}
                          >
                            <span>{match.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}
