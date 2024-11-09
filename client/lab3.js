// ===============================
// Global Variables
// ===============================
let allDestinations = []; // Store all destinations
let currentPage = 1;
let itemsPerPage = 5;
let currentListData = null;

// ===============================
// Event Listeners
// ===============================

// Display All button
document.getElementById('displayAll').addEventListener('click', () =>
{
    currentPage = 1;
    fetchAllDestinations();
});

// Search form submission
document.getElementById('searchForm').addEventListener('submit', event =>
{
    event.preventDefault();
    currentPage = 1;
    fetchSearchResults();
});

// Display per page settings
document.getElementById('displayPerPage').addEventListener('change', (event) =>
{
    itemsPerPage = parseInt(event.target.value);
    currentPage = 1;
    displayPaginatedData();
});

// Pagination navigation
document.getElementById('prevPage').addEventListener('click', () =>
{
    if (currentPage > 1)
    {
        currentPage--;
        displayPaginatedData();
    }
});

document.getElementById('nextPage').addEventListener('click', () =>
{
    const totalPages = Math.ceil(allDestinations.length / itemsPerPage);
    if (currentPage < totalPages)
    {
        currentPage++;
        displayPaginatedData();
    }
});

// Create new list
document.getElementById('createListForm').addEventListener('submit', async (event) =>
{
    event.preventDefault();
    const listName = document.getElementById('newListName').value.trim();
    if (!listName)
    {
        alert("Please enter a valid list name.");
        return;
    }

    try
    {
        const response = await fetch('/api/userLists/newList/' + encodeURIComponent(listName), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinations: [] })
        });

        const result = await response.json();
        if (response.ok)
        {
            alert(`List '${result.newList.name}' created successfully!`);
            document.getElementById('createListForm').reset();
            fetchAndDisplayLists();
        } else
        {
            alert(`Error: ${result.error}`);
        }
    } catch (error)
    {
        console.error('Error creating list:', error);
        alert('An error occurred while creating the list. Please try again.');
    }
});

// Sort criteria
document.getElementById('sortCriteria').addEventListener('change', () =>
{
    if (currentListData)
    {
        displaySortedListContent();
    }
});

// Delete list form handler
document.getElementById('delListForm').addEventListener('submit', async (event) =>
{
    event.preventDefault();
    const listName = document.getElementById('delListName').value.trim();
    if (!listName)
    {
        alert("Please enter a valid list name.");
        return;
    }

    try
    {
        const response = await fetch(`/api/userLists/${encodeURIComponent(listName)}`, {
            method: 'DELETE'
        });

        if (response.ok)
        {
            alert(`List '${listName}' deleted successfully!`);
            document.getElementById('delListForm').reset();

            // Clear the list content if it was being displayed
            if (currentListData && currentListData.listName === listName)
            {
                currentListData = null;
                const dynamicListContent = document.getElementById('dynamicListContent');
                dynamicListContent.innerHTML = '';
                document.getElementById('listItem').style.display = 'none';
            }

            // Always fetch and update the display after deletion
            await fetchAndDisplayLists();
        } else
        {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error)
    {
        console.error('Error deleting list:', error);
        alert('An error occurred while deleting the list. Please try again.');
    }
});


// ===============================
// Fetch Functions
// ===============================

async function fetchAllDestinations()
{
    try
    {
        const response = await fetch('/api/destinations');
        if (!response.ok) throw new Error('Network response was not ok');
        allDestinations = await response.json();
        displayPaginatedData();
    } catch (error)
    {
        console.error('Error fetching destinations:', error);
    }
}

async function fetchSearchResults()
{
    const field = document.getElementById('criteria').value;
    const pattern = document.getElementById('searchTerm').value;
    const numMatches = document.getElementById('numMatches').value || '';

    try
    {
        const response = await fetch(`/api/search/${field}/${pattern}/${numMatches}`);
        if (!response.ok) throw new Error('Network response was not ok');
        allDestinations = await response.json();
        displayPaginatedData();
    } catch (error)
    {
        console.error('Error fetching search results:', error);
    }
}

async function fetchAndDisplayLists()
{
    try
    {
        const response = await fetch('/api/userLists');
        const lists = await response.json();
        const listsContainer = document.getElementById('lists');
        listsContainer.innerHTML = ''; // Clear current content

        if (!Array.isArray(lists) || lists.length === 0)
        {
            // Handle empty lists case
            const noListsMessage = document.createElement('li');
            noListsMessage.textContent = 'No lists available';
            noListsMessage.style.padding = '8px';
            listsContainer.appendChild(noListsMessage);
            return;
        }

        lists.forEach(list =>
        {
            const listItem = document.createElement('li');
            listItem.textContent = list.name;
            listItem.addEventListener('click', () =>
            {
                fetchAndDisplayListContent(list.name);
            });
            listsContainer.appendChild(listItem);
        });
    } catch (error)
    {
        console.error('Error fetching lists:', error);
        const listsContainer = document.getElementById('lists');
        listsContainer.innerHTML = '<li>Error loading lists</li>';
    }
}


async function fetchAndDisplayListContent(listName)
{
    try
    {
        const response = await fetch(`/api/userLists/allProperties/${encodeURIComponent(listName)}`);
        if (!response.ok) throw new Error('Failed to fetch list content.');

        // Store the list data globally
        currentListData = await response.json();
        displaySortedListContent();

    } catch (error)
    {
        console.error('Error fetching list content:', error);
    }
}

// ===============================
// Display Functions
// ===============================

function displayPaginatedData()
{
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDestinations = allDestinations.slice(startIndex, endIndex);

    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    paginatedDestinations.forEach((destination, index) =>
    {
        const destinationItem = document.createElement('div');
        destinationItem.classList.add('destination-item');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('destination-content');

        // Create the list selection controls
        const listControlsDiv = document.createElement('div');
        listControlsDiv.classList.add('list-controls-container');

        // Create the input field
        const listInput = document.createElement('input');
        listInput.type = 'text';
        listInput.placeholder = 'Enter list name';
        listInput.classList.add('list-input');

        // Create the Add button
        const addButton = document.createElement('button');
        addButton.textContent = 'Add to List';
        addButton.classList.add('submit-btn');
        addButton.addEventListener('click', () =>
        {
            const selectedList = listInput.value.trim();
            if (selectedList)
            {
                const globalIndex = startIndex + index;
                addToList(globalIndex, selectedList);
                listInput.value = '';
            } else
            {
                alert('Please enter a list name');
            }
        });

        // Add the controls to the container
        listControlsDiv.appendChild(listInput);
        listControlsDiv.appendChild(addButton);
        contentDiv.appendChild(listControlsDiv);

        const destinationList = document.createElement('ul');
        for (const key in destination)
        {
            if (destination.hasOwnProperty(key) && key !== 'Latitude' && key !== 'Longitude')
            {
                const listItem = document.createElement('li');
                listItem.textContent = `${key}: ${destination[key]}`;
                destinationList.appendChild(listItem);
            }
        }
        contentDiv.appendChild(destinationList);

        const mapContainer = document.createElement('div');
        mapContainer.classList.add('map-container');
        mapContainer.id = `map-${startIndex + index}`;

        destinationItem.appendChild(contentDiv);
        destinationItem.appendChild(mapContainer);
        resultsContainer.appendChild(destinationItem);

        const map = L.map(mapContainer.id).setView([parseFloat(destination['Latitude']), parseFloat(destination['Longitude'])], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        L.marker([parseFloat(destination['Latitude']), parseFloat(destination['Longitude'])]).addTo(map)
            .bindPopup(`<b>${destination['Destination'] || destination[' Destination']}</b>`);
    });

    updatePaginationControls();
}

function displaySortedListContent()
{
    if (!currentListData) return;

    // Get the sort criteria and sort the destinations
    const sortCriteria = document.getElementById('sortCriteria').value;
    const sortedDestinations = sortDestinations(currentListData.destinations, sortCriteria);

    // Get the dynamic content container
    const dynamicListContent = document.getElementById('dynamicListContent');
    dynamicListContent.innerHTML = '';

    // Set display property to make #listItem visible
    const listItemContainer = document.getElementById('listItem');
    listItemContainer.style.display = 'block';

    // Display the list title
    const listTitle = document.createElement('h3');
    listTitle.classList.add('h3');
    listTitle.textContent = `Destinations in "${currentListData.listName}"`;
    dynamicListContent.appendChild(listTitle);

    if (sortedDestinations.length === 0)
    {
        const noDestinationsMessage = document.createElement('p');
        noDestinationsMessage.textContent = "No destinations added to this list";
        dynamicListContent.appendChild(noDestinationsMessage);
    } else
    {
        // Display each destination in the list
        sortedDestinations.forEach((destination, index) =>
        {
            const destinationItem = document.createElement('div');
            destinationItem.classList.add('destination-item');

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('destination-content');

            const destinationList = document.createElement('ul');
            for (const key in destination)
            {
                if (destination.hasOwnProperty(key) && key !== 'Latitude' && key !== 'Longitude')
                {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${key}: ${destination[key]}`;
                    destinationList.appendChild(listItem);
                }
            }
            contentDiv.appendChild(destinationList);

            const mapContainer = document.createElement('div');
            mapContainer.classList.add('map-container');
            mapContainer.id = `list-map-${index}`;

            destinationItem.appendChild(contentDiv);
            destinationItem.appendChild(mapContainer);
            dynamicListContent.appendChild(destinationItem);

            // Initialize the map for this destination
            const map = L.map(`list-map-${index}`).setView([parseFloat(destination['Latitude']), parseFloat(destination['Longitude'])], 13);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);

            L.marker([parseFloat(destination['Latitude']), parseFloat(destination['Longitude'])]).addTo(map)
                .bindPopup(`<b>${destination['Destination'] || destination[' Destination']}</b>`);
        });
    }
}

// ===============================
// Utility Functions
// ===============================

async function addToList(destinationIndex, listName)
{
    try
    {
        // First get the list to check its current destinations
        const response = await fetch(`/api/userLists/ids/${encodeURIComponent(listName)}`);
        if (!response.ok) throw new Error('Failed to fetch list.');
        const list = await response.json();

        // Add the new destination ID if it's not already in the list
        const currentDestinations = list.destinationIds || [];
        if (!currentDestinations.includes(destinationIndex))
        {
            currentDestinations.push(destinationIndex);
        }

        // Update the list with the new destination
        const updateResponse = await fetch(`/api/userLists/${encodeURIComponent(listName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destinations: currentDestinations })
        });

        if (!updateResponse.ok) throw new Error('Failed to update list.');

        alert(`Destination added to ${listName} successfully!`);
    } catch (error)
    {
        console.error('Error adding to list:', error);
        alert('Failed to add destination to list. Please try again.');
    }
}

function updatePaginationControls()
{
    const totalPages = Math.ceil(allDestinations.length / itemsPerPage);
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

function sortDestinations(destinations, criteria)
{
    if (criteria === 'none') return destinations; // Return unsorted array if 'none' selected

    // Create a copy of the array to sort
    let sortedDestinations = [...destinations];

    // Define the key to sort by based on the criteria
    let sortKey;
    switch (criteria)
    {
        case 'destination':
            sortKey = 'Destination';
            break;
        case 'region':
            sortKey = 'Region';
            break;
        case 'country':
            sortKey = 'Country';
            break;
        default:
            return sortedDestinations;
    }

    // Sort the array
    sortedDestinations.sort((a, b) =>
    {
        // Handle potential leading spaces in the destination field
        let valueA = (a[sortKey] || a[' ' + sortKey] || '').trim().toLowerCase();
        let valueB = (b[sortKey] || b[' ' + sortKey] || '').trim().toLowerCase();
        return valueA.localeCompare(valueB);
    });

    return sortedDestinations;
}


// ===============================
// Initialize Application
// ===============================
fetchAndDisplayLists();