import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Bookmark, SearchSettings } from "@/api/services/searchService";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { bookmarkGrid, safeIcon, validUrl } from "./logic";
import { OnlineImage, useLabels } from "./shared";

function Icon({ item }: { item: Bookmark }) {
	const icon = safeIcon(item.iconUrl);
	return icon ? (
		<OnlineImage key={icon} url={icon} alt={item.name} className="search-bookmark-icon" />
	) : (
		<span className="search-bookmark-icon" aria-hidden="true">
			{item.name.slice(0, 1).toUpperCase()}
		</span>
	);
}

function SortableBookmark({
	item,
	editing,
	busy,
	newTab,
	edit,
	remove,
}: {
	item: Bookmark;
	editing: boolean;
	busy: boolean;
	newTab: boolean;
	edit: (item: Bookmark) => void;
	remove: (item: Bookmark) => void;
}) {
	const l = useLabels();
	const [actionsOpen, setActionsOpen] = useState(false);
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: item.id,
		disabled: !editing || busy,
	});
	const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
	const href = validUrl(item.url);
	return (
		<li ref={setNodeRef} style={style} className={`search-bookmark${isDragging ? " is-dragging" : ""}`}>
			{editing || !href ? (
				<div className="search-bookmark-link">
					<Icon item={item} />
					<span className="search-bookmark-name">{item.name}</span>
				</div>
			) : (
				<a
					className="search-bookmark-link"
					href={href}
					target={newTab ? "_blank" : undefined}
					rel="noopener noreferrer"
					title={item.name}
				>
					<Icon item={item} />
					<span className="search-bookmark-name">{item.name}</span>
				</a>
			)}
			{editing && (
				<Popover open={actionsOpen} onOpenChange={setActionsOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="search-bookmark-tools"
							disabled={busy}
							aria-label={`${l("bookmarkActions")} ${item.name}`}
							title={l("bookmarkActions")}
						>
							<MoreHorizontal size={18} />
						</button>
					</PopoverTrigger>
					<PopoverContent
						className="search-bookmark-actions"
						sideOffset={8}
						aria-label={`${l("bookmarkActions")} ${item.name}`}
					>
						<button
							type="button"
							className="search-bookmark-handle"
							disabled={busy}
							title={l("reorder")}
							aria-label={`${l("reorder")} ${item.name}`}
							{...attributes}
							{...listeners}
							aria-describedby={`${attributes["aria-describedby"]} search-sort-help`}
						>
							<GripVertical size={16} />
						</button>
						<button
							type="button"
							disabled={busy}
							title={l("editBookmark")}
							aria-label={`${l("editBookmark")} ${item.name}`}
							onClick={() => {
								setActionsOpen(false);
								edit(item);
							}}
						>
							<Pencil size={15} />
						</button>
						<button
							type="button"
							disabled={busy}
							title={l("delete")}
							aria-label={`${l("delete")} ${item.name}`}
							onClick={() => {
								setActionsOpen(false);
								remove(item);
							}}
						>
							<Trash2 size={15} />
						</button>
					</PopoverContent>
				</Popover>
			)}
		</li>
	);
}

export function Bookmarks({
	items,
	settings,
	editing,
	edit,
	add,
	busy,
	remove,
	reorder,
}: {
	items: Bookmark[];
	settings: SearchSettings;
	editing: boolean;
	edit: (item: Bookmark) => void;
	add: () => void;
	busy: boolean;
	remove: (item: Bookmark) => void;
	reorder: (from: number, to: number) => void;
}) {
	const l = useLabels();
	const container = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const mobile = useMediaQuery({ maxWidth: 767 });
	useEffect(() => {
		const element = container.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	const grid = bookmarkGrid(Math.max(0, width - 8), items.length + 1, settings, mobile, editing);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);
	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return;
		const from = items.findIndex((item) => item.id === active.id);
		const to = items.findIndex((item) => item.id === over.id);
		if (from >= 0 && to >= 0) reorder(from, to);
	};
	const style = {
		"--search-icon": `${grid.icon}px`,
		"--search-gap": `${grid.gap}px`,
		"--search-radius": `${Math.min(settings.radius, grid.icon / 2)}px`,
		"--search-cell": `${grid.cell}px`,
		gridTemplateColumns: `repeat(${grid.columns}, minmax(0, ${grid.cell}px))`,
		gridTemplateRows: grid.rows ? `repeat(${grid.rows}, auto)` : undefined,
		gridAutoFlow: grid.column ? "column" : "row",
	} as CSSProperties;
	return (
		<div className="search-bookmarks-wrap" ref={container}>
			{!items.length && <p className="search-empty">{l("emptyBookmarks")}</p>}
			{editing && (
				<p id="search-sort-help" className="sr-only">
					{l("sortHelp")}
				</p>
			)}
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
				<SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
					<ul className={`search-bookmarks search-bookmarks-${settings.layoutDirection}`} style={style}>
						{items.map((item) => (
							<SortableBookmark
								key={item.id}
								item={item}
								editing={editing}
								busy={busy}
								newTab={settings.openInNewTab}
								edit={edit}
								remove={remove}
							/>
						))}
						<li className="search-bookmark">
							<button type="button" className="search-bookmark-link" disabled={busy} onClick={add}>
								<span className="search-bookmark-icon search-bookmark-add" aria-hidden="true">
									<Plus size={24} />
								</span>
								<span className="search-bookmark-name">{l("addBookmark")}</span>
							</button>
						</li>
					</ul>
				</SortableContext>
			</DndContext>
		</div>
	);
}
