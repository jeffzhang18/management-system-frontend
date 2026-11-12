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
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { Bookmark, SearchSettings } from "@/api/services/searchService";
import { safeIcon, validUrl } from "./logic";
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
				<div className="search-bookmark-actions">
					<button
						type="button"
						className="search-bookmark-handle"
						disabled={busy}
						title={l("reorder")}
						aria-label={`${l("reorder")} ${item.name}`}
						{...attributes}
						{...listeners}
					>
						<GripVertical size={16} />
					</button>
					<button
						type="button"
						disabled={busy}
						title={l("editBookmark")}
						aria-label={`${l("editBookmark")} ${item.name}`}
						onClick={() => edit(item)}
					>
						<Pencil size={15} />
					</button>
					<button
						type="button"
						disabled={busy}
						title={l("delete")}
						aria-label={`${l("delete")} ${item.name}`}
						onClick={() => remove(item)}
					>
						<Trash2 size={15} />
					</button>
				</div>
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
		"--search-icon": `${settings.iconSize}px`,
		"--search-gap": `${settings.gap}px`,
		"--search-radius": `${settings.radius}px`,
		"--search-count": settings.itemsPerLine,
	} as CSSProperties;
	return (
		<div className="search-bookmarks-wrap">
			{!items.length && <p className="search-empty">{l("emptyBookmarks")}</p>}
			{editing && items.length > 1 && <p className="search-help search-sort-help">{l("sortHelp")}</p>}
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
