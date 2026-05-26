// app/lab/components/EditBanner.tsx
// Yellow banner shown at the top of the page when edit mode is active

export default function EditBanner() {
	return (
		<div className="edit-banner">
			<span className="edit-banner-title">
				✏️ Edit Mode — drag hotspots to reposition · select one to edit text
			</span>
			<span className="edit-banner-hint">
				Type the sequence again to exit
			</span>
		</div>
	);
}
